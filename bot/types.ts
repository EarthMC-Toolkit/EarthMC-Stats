/* eslint-disable no-unused-vars */
import type { 
    Client,
    Message,
    BaseInteraction,
    ChatInputCommandInteraction,
    SharedNameAndDescription
} from "discord.js"

import type { Map } from "earthmc"
import type { Timestamp, WriteResult } from "firebase-admin/firestore"

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
    getAlliance(name: string): Promise<DBAlliance>
    getAlliances(skipCache: boolean): Promise<DBAlliance[]> 
    setAlliances(alliances: DBAlliance[]): Promise<WriteResult>
    getResidents(): Promise<DBResident[]>
    setResidents(residents: DBResident[]): Promise<void>
    getTowns(): Promise<any>
    setTowns(towns: any[]): Promise<void>
    getNations(): Promise<any>
    setNations(nations: any[]): Promise<void>
}

export type DBAlliance = {
    allianceName: string
    leaderName: string,
    discordInvite: string,
    nations: string[],
    type: 'sub' | 'mega' | 'normal'
}

export type ResidentRank = 'Nation Leader' | 'Mayor' | 'Resident'
export type DBResident = {
    name: string
    townName: string
    townNation: string
    rank: ResidentRank
}

export type SkinOpts = {
    view: SkinType2D | SkinType3D,
    subject: string | number,
    width?: number,
    height?: number
}

type SkinType2D = (typeof SkinType2D)[keyof typeof SkinType2D]
export const SkinType2D = {
    FACE: 'face',
    FRONT: 'front',
    FULL: 'frontfull'
} as const

type SkinType3D = (typeof SkinType3D)[keyof typeof SkinType3D]
export const SkinType3D = {
    HEAD: 'head',
    BUST: 'bust',
    FULL: 'full'
} as const

export type ResidentProfile = {
    name: string
    linkedID: string | number
    lastOnline: {
        nova: Date | Timestamp
        aurora: Date | Timestamp
    }
}