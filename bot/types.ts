import type { 
    Client,
    Message,
    BaseInteraction,
    ChatInputCommandInteraction,
    SharedNameAndDescription,
    Collection
} from "discord.js"

import type { 
    Squaremap, SquaremapOnlinePlayer, 
    SquaremapTown, SquaremapNation,
    RawPlayerStatsV3,
    RawPlayerV3
} from "earthmc"

import type { Timestamp, WriteResult } from "firebase-admin/firestore"

export type ErrorWithCode = Error & { code: number }
export type ReqMethod = 'GET' | 'PUT' | 'POST'

export type CustomClientData = {
    auroraCommands?: Map<string, BaseCommand>
    slashCommands?: Map<string, SlashCommand<SharedNameAndDescription>>
    buttons?: Collection<string, Button>
}

export type ExtendedClient = Client & CustomClientData

export type BaseCommand = {
    name: string
    description?: string
    disabled?: boolean
}

export type SlashCommand<TData extends SharedNameAndDescription> = BaseCommand & {
    data?: TData
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
    execute: (client: Client, interaction: BaseInteraction, args?: string[]) => any
}

export type DJSEvent = {
    name: string
    once?: boolean
    execute: (...args: any[]) => any
}

export type MapInstance = { 
    emc: Squaremap,
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

export interface MapDB {
    getAlliance(name: string): Promise<DBAlliance>
    getAlliances(skipCache: boolean): Promise<DBAlliance[]> 
    setAlliances(alliances: DBAlliance[], changed: number[]): Promise<WriteResult>
    getResidents(): Promise<DBResident[]>
    setResidents(residents: DBResident[]): Promise<void>
    getTowns(): Promise<DBSquaremapTown[]>
    setTowns(towns: DBSquaremapTown[]): Promise<void>
    getNations(): Promise<DBSquaremapNation[]>
    setNations(nations: DBSquaremapNation[]): Promise<void>
    getPlayerStats(): Promise<RawPlayerStatsV3>
    setPlayerStats(nations: RawPlayerStatsV3): Promise<WriteResult>
}

export type AllianceType = 'sub' | 'mega' | 'normal'
export type DBAlliance = {
    allianceName: string
    leaderName: string
    type: AllianceType
    nations: string[]
    lastUpdated: Timestamp
} & Partial<{
    fullName: string
    imageURL: string
    discordInvite: string
    colours: {
        fill: string
        outline: string
    }
    towns: number
    residents: number
    area: number
    rank: number
}>

export type ResidentRank = 'Nation Leader' | 'Mayor' | 'Resident'
export type DBResident = {
    name: string
    townName: string
    townNation: string
    rank: ResidentRank
}

export interface DBPlayer {
    name: string
    lastOnline: {
        aurora?: Timestamp
    }
}

export type TownInfo = { 
    ruined?: boolean 
}

export type CustomNationInfo = Partial<{
    kingPrefix: string
    flag: string
    discord: string
}>

//export type DBTown = Town & TownInfo
export type DBSquaremapTown = SquaremapTown & TownInfo

//export type DBNation = Nation & CustomNationInfo
export type DBSquaremapNation = SquaremapNation & CustomNationInfo

export type SkinOpts = {
    view: SkinType2D | SkinType3D
    subject: string | number
    size?: number
    pitch?: number
    yaw?: number
    roll?: number
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

export type TownDataItem = {
    name: string
    nation: string
    residents?: string[]
    onlineResidents: string[]
}

export type TownItem = {
    name: string
    nation: string
    chunks: number
    residents: string[]
    onlineResidents?: string[]
}

export type NationItem = {
    name: string
    residents: string[]
    onlineResidents: string[]
    chunks: number
}

export type SeenPlayer = SquaremapOnlinePlayer & {
    timesVanished: number
    online: boolean
    timestamp: number // Milliseconds
}

//#region Staff
export const staffResponse = {
    owner: [] as string[],
    admin: [] as string[],
    developer: [] as string[],
    staffmanager: [] as string[],
    moderator: [] as string[],
    helper: [] as string[]
} as const

export type StaffResponse = typeof staffResponse
export type StaffRole = keyof StaffResponse
export type StaffRoleOrUnknown = StaffRole | "unknown"

export type StaffMember = {
    player: RawPlayerV3
    role: StaffRoleOrUnknown
}
//#endregion