// src/types.ts
export interface StreamlabsMessage {
	name?: string; // Имя пользователя (подписки, фолловеры)
	from?: string; // Альтернативное имя (рейды, хосты)
	display_name?: string; // Имя для отображения
	amount?: string | number; // Сумма (донаты, биты, суперчаты)
	formatted_amount?: string; // Форматированная сумма
	raiders?: string | number; // Количество рейдеров
	viewers?: string | number; // Количество зрителей (хосты)
	message?: string; // Сообщение (донаты, суперчаты)
	product?: string; // Название мерча
	[key: string]: any; // Для дополнительных полей
}

export interface StreamlabsEvent {
	type: string;
	message: StreamlabsMessage[] | StreamlabsMessage;
	[key: string]: any;
}