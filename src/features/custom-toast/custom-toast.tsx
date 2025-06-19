import type { FC } from 'react'
import type { event } from './types.ts'


type CustomToastProps = {
	event: event
	eventType: string
	avatarUrl: string
};
export const CustomToast: FC<CustomToastProps> = (props) => {
	const { event, eventType, avatarUrl } = props
	const username = event.display_name || event.user_name || 'Unknown User'

	const typeMessage = [
		{
			type: 'channel.subscribe',
			typeMessage: 'Только что подписался!'
		},
		{
			type: 'channel.follow',
			typeMessage: 'только что подписался на канал!'
		},
		{
			type: 'channel.raid',
			typeMessage: `совершил рейд с ${ event.viewers } зрителями!`
		}
	]
	const fontStyleDgo = {
		fontFamily: 'dgo, Arial, sans-serif'
	}
	const fontStyleRoboto_flex = {
		fontFamily: 'roboto_flex, Arial, sans-serif'
	}
	return (
		typeMessage.map((item, i) => (
			item.type === eventType &&
			<div className={ 'flex gap-2 items-center p-2 rounded-3xl' } key={ item.typeMessage + i }>
				<img
					src={ avatarUrl }
					className={ 'w-16 h-16 rounded-2xl' }
					alt={ item.typeMessage + i }
				/>
				<div className={ 'text-[#333333] flex flex-col gap-1' }>
					<div className={ 'text-lg' } style={ fontStyleDgo }>
						{ username }
					</div>
					<div style={ fontStyleRoboto_flex}>{ item.typeMessage }</div>
				</div>
			</div>
		))
	)
}