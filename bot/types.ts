/* eslint-disable no-unused-vars */
import { 
    Client,
    Message,
    BaseInteraction,
    ChatInputCommandInteraction,
    SharedNameAndDescription
} from "discord.js"

import { Map } from "earthmc"

export type BaseCommand = {
    name: string
    description?: string
    disabled?: boolean
}

export type SlashCommand<TData extends SharedNameAndDescription> = BaseCommand & {
    data?: TData & { toJSON: () => any }
    cooldown?: number
    run: (client: Client, interaction: ChatInputCommandInteraction) => any
}

export type MessageCommand = BaseCommand & {
    aliases?: string[] 
    slashCommand?: boolean
    run: (client: Client, message: Message, args?: string[]) => any
}

export type Button = {
    id: string
    permissions?: any[]
    description?: string
    disabled?: boolean
    execute: (client: Client, interaction: BaseInteraction, args?: any[]) => any
}

export type DJSEvent = {
    name: string
    once?: boolean
    execute: (...args) => any
}

export type MapInstance = { 
    emc: Map,
    db: MapDB
}

export type MCUserProfile = {
    id: string | number
    name: string
}

export type MCProfileProperty = {
    name: string
    value: string
}

export type MCSessionProfile = MCUserProfile & {
    properties: MCProfileProperty[]
    profileActions: any[]
}

export type MapDB = {
    getAlliance(name: string): Promise<any>
    getAlliances(skipCache: boolean): Promise<any> 
    setAlliances(alliances: any[]): Promise<void>
    getTowns(): Promise<any>
    setTowns(towns: any[]): Promise<void>
    getNations(): Promise<any>
    setNations(nations: any[]): Promise<void>
    getResidents(): Promise<any>
    setResidents(residents: any[]): Promise<void>
}