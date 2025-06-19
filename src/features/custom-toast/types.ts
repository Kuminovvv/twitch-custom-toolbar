export interface event {
	[p: string]: any

	user_name?: string
	display_name?: string
	tier?: string
	message?: {
		text: string
	}
	amount?: number
	viewers?: number
	user_id?: string
}
