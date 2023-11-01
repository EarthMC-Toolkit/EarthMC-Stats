/* eslint-disable no-unused-vars */
import { 
    type Client,
    type Message,
    type BaseInteraction
} from "discord.js"

export type MessageCommand = {
    name: string
    aliases?: string[] 
    description?: string
    slashCommand?: boolean
    run: (client: Client, message: Message, args: string[]) => any
}

export type Button = {
    name: string
    execute: (client: Client, interaction: BaseInteraction) => any
}