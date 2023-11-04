/* eslint-disable no-unused-vars */
import { 
    Client,
    Message,
    BaseInteraction,
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js"

export type InteractionCommand = {
    name: string
    description?: string
    disabled?: boolean
    data?: SlashCommandBuilder
    run: (client: Client, interaction: ChatInputCommandInteraction) => any
}

export type MessageCommand = {
    name: string
    aliases?: string[] 
    description?: string
    slashCommand?: boolean
    disabled?: boolean
    run: (client: Client, message: Message, args: string[]) => any
}

export type Button = {
    name: string
    execute: (client: Client, interaction: BaseInteraction) => any
}