import { useEffect, useRef, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { CustomToast } from '../../features/custom-toast/custom-toast.tsx'

interface TwitchEvent {
	subscription: { type: string; condition: { [key: string]: string } };
	event: {
		user_name?: string;
		display_name?: string;
		tier?: string;
		message?: { text: string };
		amount?: number;
		viewers?: number;
		user_id?: string; // Добавляем user_id для получения аватара
		[key: string]: any;
	};
}

interface UserProfile {
	id: string;
	login: string;
	display_name: string;
	profile_image_url: string;

	[key: string]: any;
}

// Хранилище обработанных событий для предотвращения дублирования
const handledEvents = new Set<string>()

export const Alerts = () => {
	const socketRef = useRef<WebSocket | null>(null) // Ссылка на WebSocket
	const sessionIdRef = useRef<string | null>(null) // Ссылка на ID сессии
	const [accessToken, setAccessToken] = useState<string | null>(import.meta.env.VITE_TWITCH_ACCESS_TOKEN) // Токен доступа
	const [isConnecting, setIsConnecting] = useState(false) // Флаг подключения
	const [subscriptionAttempts, setSubscriptionAttempts] = useState(0) // Счетчик попыток подписки
	const [isConnected, setIsConnected] = useState(false) // Флаг активного соединения
	const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({}) // Хранилище профилей пользователей

	const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID // Идентификатор клиента из .env
	const clientSecret = import.meta.env.VITE_TWITCH_CLIENT_SECRET // Секретный код клиента из .env
	const broadcasterId = import.meta.env.VITE_BROADCASTER_USER_ID // ID транслятора из .env


	const getTwitchAccessToken = async (): Promise<string> => {
		if (!clientId || !clientSecret) {
			throw new Error('Missing Twitch Client ID or Client Secret in .env')
		}
		const response = await fetch('https://id.twitch.tv/oauth2/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'client_credentials'
			}).toString()
		})
		const data = await response.json()
		if (!response.ok) throw new Error(data.message || 'Unknown error')
		return data.access_token
	}

	// Получение данных пользователя по user_id
	const fetchUserProfile = async (userId: string) => {
		if (userProfiles[userId]) return userProfiles[userId] // Кэшируем профиль
		try {
			const response = await fetch(`https://api.twitch.tv/helix/users?id=${ userId }`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${ accessToken }`,
					'Client-Id': clientId,
					'Content-Type': 'application/json'
				}
			})
			const data = await response.json()
			if (data.data && data.data.length > 0) {
				const profile = data.data[0]
				setUserProfiles((prev) => ({ ...prev, [userId]: profile }))
				return profile
			}
			return null
		} catch (error) {
			console.error('Error fetching user profile:', error)
			return null
		}
	}

	const subscribeToEvent = async (type: string, condition: { [key: string]: string } = {}, delay = 0) => {
		if (!sessionIdRef.current || !accessToken || !broadcasterId || subscriptionAttempts >= 4) {
			return
		}
		await new Promise((resolve) => setTimeout(resolve, delay)) // Задержка между подписками
		setSubscriptionAttempts((prev) => prev + 1)
		try {
			const baseCondition = { broadcaster_user_id: broadcasterId }
			const finalCondition = { ...baseCondition, ...condition }
			const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${ accessToken }`,
					'Client-Id': clientId,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type,
					version: type === 'channel.follow' ? '2' : '1',
					condition: finalCondition,
					transport: { method: 'websocket', session_id: sessionIdRef.current }
				})
			})
			const data = await response.json()
			if (data.error) {
				console.error(`Subscription error for ${ type }:`, data.error, data.message)
				if (data.status === 429) {
					console.warn('Rate limit exceeded, skipping additional subscriptions')
					return // Прерываем дальнейшие попытки при 429
				}
			} else if (data.status === 202) {
				console.log(`Subscription for ${ type } accepted`)
			}
		} catch (error) {
			console.error(`Subscription error for ${ type }:`, error)
		}
	}

	const handleEvent = async (eventData: TwitchEvent) => {
		const { subscription, event } = eventData
		const eventType = subscription.type
		const eventId = event.id || `${ eventType }-${ Date.now() }`

		if (handledEvents.has(eventId)) {
			return
		}
		handledEvents.add(eventId)

		let avatarUrl = ''

		if (event.user_id) {
			const profile = await fetchUserProfile(event.user_id)
			if (profile?.profile_image_url) {
				avatarUrl = profile.profile_image_url
			}
		}

		toast(() => (
			<CustomToast
				event={ event }
				eventType={ eventType }
				avatarUrl={avatarUrl}
			/>
		))
	}

	const connectWebSocket = () => {
		if (!accessToken || isConnecting || (socketRef.current && socketRef.current.readyState === WebSocket.OPEN)) return // Проверка активного соединения
		setIsConnecting(true)

		// Закрываем существующее соединение, если оно есть и не в процессе закрытия
		if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
			socketRef.current.close()
		}

		const socket = new WebSocket('wss://eventsub.wss.twitch.tv/ws')
		socketRef.current = socket

		socket.onopen = () => {
			console.log('Connected to Twitch EventSub WebSocket')
			setIsConnected(true)
			setIsConnecting(false)
		}

		socket.onmessage = (event) => {
			const data = JSON.parse(event.data)
			console.log('Received Twitch message:', data)

			if (data.metadata?.message_type === 'session_welcome') {
				sessionIdRef.current = data.payload.session.id
				console.log('Twitch Session ID:', sessionIdRef.current)
				if (accessToken && broadcasterId && !isConnected) {
					subscribeToEvent('channel.subscribe')
					subscribeToEvent('channel.follow', { moderator_user_id: broadcasterId })
					subscribeToEvent('channel.cheer')
					subscribeToEvent('channel.raid', { to_broadcaster_user_id: broadcasterId })
					setSubscriptionAttempts(0) // Сброс счетчика попыток
				} else {
					console.warn('Cannot subscribe: missing accessToken, broadcasterId, or already connected')
				}
			} else if (data.metadata?.message_type === 'notification') {
				console.log('Notification payload:', data.payload) // Отладка уведомлений
				handleEvent(data.payload)
			} else if (data.metadata?.message_type === 'revocation') {
				console.log('Subscription revoked:', data.payload)
			} else if (data.metadata?.message_type === 'websocket_reconnect') {
				console.log('Reconnect required:', data.payload.websocket.url)
				socketRef.current?.close()
				socketRef.current = new WebSocket(data.payload.websocket.url)
			}
		}

		socket.onclose = (reason) => {
			console.log('Disconnected from Twitch EventSub WebSocket:', reason)
			setIsConnected(false)
			setIsConnecting(false)
			if (reason.code === 1006 || reason.code === 4003) {
				if (!isConnecting) {
					setTimeout(connectWebSocket, 2000)
				}
			}
		}

		socket.onerror = (error) => {
			console.error('WebSocket error:', error)
			setIsConnected(false)
			setIsConnecting(false)
		}
	}

	useEffect(() => {
		let tokenRefreshInterval: NodeJS.Timeout

		const init = async () => {
			try {
				const token = accessToken || (await getTwitchAccessToken())
				setAccessToken(token)
			} catch (error) {
				console.error('Failed to get access token:', error)
			}
		}

		// Задержка перед первым подключением
		const delayedConnect = () => setTimeout(() => connectWebSocket(), 1000)
		init().then(delayedConnect)

		tokenRefreshInterval = setInterval(() => {
			init()
		}, 50 * 60 * 1000) // Обновление токена каждые 50 минут

		return () => {
			clearInterval(tokenRefreshInterval)
			socketRef.current?.close()
		}
	}, [accessToken])

	return (
		<div>
			<Toaster
				position="top-right"
				visibleToasts={ 9 }
				expand={ true }
				richColors
				toastOptions={ { className: 'custom-toast' } }
			/>
		</div>
	)
}