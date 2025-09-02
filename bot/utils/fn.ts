import type { 
    DBAlliance,
    StaffResponse,
    StaffMember, StaffRoleOrUnknown,
    SkinOpts,
    DBSquaremapNation
} from "../types.js"

import type {
    Client,
    APIEmbedField
} from "discord.js"

import {
    EmbedBuilder,
    AttachmentBuilder,
    Colors
} from "discord.js"

import { OfficialAPI } from "earthmc"

import { request } from "undici"
import { Timestamp } from "firebase-admin/firestore"

import fs from 'fs'
import path from "path"

export const botDevs = ["Owen3H", "263377802647175170"]

export const errorEmbed = (title: string, desc: string) => new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(Colors.Red)
    .setTimestamp()

export const serverIssues = errorEmbed("Server Issues", "Currently unable to reach EarthMC, it's most likely down.")
export const townyIssues = errorEmbed("Towny Issues", "Currently unable to fetch Towny data, try again later!" )
export const dynmapIssues = errorEmbed("Dynmap Issues", "Currently unable to fetch Dynmap data, try again later!")
export const databaseError = errorEmbed("Database Error", "An error occurred requesting custom database info!")
export const fetchError = errorEmbed("Fetch Error", "Unable to fetch required data, please try again!")

const STAFF_LIST_URL = "https://raw.githubusercontent.com/jwkerr/staff/master/staff.json"
export const getStaff = async (): Promise<StaffMember[]> => {
    const staffListRes = await request(STAFF_LIST_URL).then(res => res.body.json()) as StaffResponse

    const staffUuids = Object.values(staffListRes).flat()
    const staff = await OfficialAPI.V3.players(...staffUuids) // Send a single req with all staff UUIDs.

    // TODO: Store in DB in case OAPI goes down.
    // Re-associate the staff with their role from the list and provide their player data.
    return staff.map(player => {
        const keys = Object.keys(staffListRes)
        const role = keys.find(key => staffListRes[key].includes(player.uuid)) ?? "unknown"

        return { role: role as StaffRoleOrUnknown, player } satisfies StaffMember
    })
}

export const auroraNationBonus = (residentAmt: number) => residentAmt >= 200 ? 100
    : residentAmt >= 120 ? 80
    : residentAmt >= 80 ? 60
    : residentAmt >= 60 ? 50
    : residentAmt >= 40 ? 30
    : residentAmt >= 20 ? 10 : 0

// TODO: Do something with this so the name isn't as ambiguous.
export const AURORA = {
    thumbnail: attachmentFromFile('/bot/images/aurora.png', 'aurora.png'),
    newsChannel: "970962878486183958"
}

// UTC time in British style (d/m/y)
export function time(date = new Date()) {
    return date.toLocaleString('en-GB', { timeZone: 'UTC' })
}

export const error = (client: Client, message: string, error: string) => new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle(message)
    .setDescription(`${error}`)
    .setFooter({ text: client.user.username, iconURL: client.user.avatarURL() })
    .setTimestamp()

export const devsFooter = (client: Client) => ({
    text: `Maintained by ${botDevs[0]}`, 
    iconURL: client.user.avatarURL()
})

/**
 * This function returns the proper Unix timestamp in `milliseconds` from the given JS {@link Date} 
 * or Firestore {@link Timestamp} object.\
 * If the input is not an instance of either, `null` is returned.
 * 
 * This function will **NOT** work with Discord timestamps unless converted to seconds, it is recommended to use this
 * function only when high precision is required such as in comparing timestamps in a sort.
 * @param date
 */
export function unixFromDate(date: Date | Timestamp): number {
    // I forgot why we avoid dot notation but I think it's important.
    if (date instanceof Timestamp) return date["seconds"] * 1000
    if (date instanceof Date) return date.getTime()
    
    return null
}

//export const deepCopy = <T>(arr: T[]) => JSON.parse(JSON.stringify(arr))
//export const isEmpty = (str: string) => (!str || str.length === 0)

// UTC is safe to divide by 24 hours
export const daysBetween = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime()
    return Math.ceil(diff / (1000 * 3600 * 24))
}

export function divideArray<T>(arr: T[], n: number) {
    const chunks: T[][] = []

    const arrLen = arr.length
    const chunkLength = Math.max(arrLen / n, 1)

    for (let i = 0; i < n; i++) {
        const multiplied = chunkLength * (i + 1)
        if (multiplied <= arrLen) {
            chunks.push(arr.slice(chunkLength * i, multiplied))
        }
    }
  
    return chunks
}

export const sortAlphabetical = <V extends string>(arr: V[]) => arr.sort((a, b) => {
    const [aVal, bVal] = [a.toLowerCase(), b.toLowerCase()]
    return (bVal < aVal) ? 1 : (bVal > aVal ? -1 : 0)
})

/**
 * Sorts an array alphabetically similar to {@link sortAlphabetical}, but using the specified key as the comparator.\
 * For example, instead of sorting an array of strings, we can pass an array of objects and do something like so:
 * 
 * ```ts
 * const items = [{ name: "Owen" }, { name: "Fix" }]
 * sortByKey(items, "name") // Result: [{ name: "Fix" }, { name: "Owen" }]
 * ```
 * @param arr
 * @param key 
 */
export const sortByKey = <V extends object>(arr: V[], key: string) => arr.sort((a, b) => {
    const [aVal, bVal] = [a[key].toLowerCase(), b[key].toLowerCase()]
    return (bVal < aVal) ? 1 : (bVal > aVal ? -1 : 0)
})

type KeySortOption = { key: string, callback?: any }
export function sortByOrder<V extends object>(arr: V[], keys: KeySortOption[], ascending = false) {
    arr.sort((a, b) => {
        for (const { key, callback } of keys) {
            const aVal = a[key]
            const bVal = b[key]

            const aValue = callback ? callback(aVal) : aVal
            const bValue = callback ? callback(bVal) : bVal

            if (ascending) {
                if (bValue > aValue) return -1
                if (bValue < aValue) return 1
            } else {
                if (bValue > aValue) return 1
                if (bValue < aValue) return -1
            }
        }

        return 0
    })

    return arr
}

const len = <T>(x: string | Array<T>) => x.length
export const defaultSort = <V extends object>(arr: V[]) => sortByOrder(arr, [{
    key: 'residents',
    callback: len
}, {
    key: 'area'
}, {
    key: 'name',
    callback: (k: string) => k.toLowerCase()
}])

export const defaultSortNations = (arr: DBSquaremapNation[]) => sortByOrder(arr, [{ 
    key: "residents",
    callback: len
}, { 
    key: "area"
}, { 
    key: "towns",
    callback: len
}, { 
    key: "name",
    callback: (k: string) => k.toLowerCase()
}])

// TODO: Maybe add `name` as a filter too?
export const defaultSortAlliances = (arr: DBAlliance[]) => sortByOrder(arr, [{ 
    key: "residents"
}, { 
    key: "area"
}, { 
    key: "nations",
    callback: len
}, { 
    key: "towns",
    callback: len
}])

export const maxTownSize = 940

export function attachmentFromFile(absolutePath: string, name: string, description?: string) {
    const file = fs.readFileSync(process.cwd() + absolutePath)
    return new AttachmentBuilder(file, description ? { name, description } : { name })
}

export const randomFrom = <T>(array: T[], last: number) => {
    const len = array.length
    while(true) {
        const rand = Math.floor(Math.random() * len)
        if (rand != last) return rand
    }
}

export const msToSec = (ts: number) => Math.round(ts / 1000)
export const jsonReq = (url: string) => request(url).then(res => res.body.json()).catch(() => {})

/**
 * Reads all TypeScript files (.ts) in the directory at the specified path starting from the project root (cwd).
 * @param str 
 */
export const readTsFiles = (dirPath: string) => {
    const absPath = path.resolve(process.cwd(), dirPath)
    return fs.readdirSync(absPath).filter(file => file.endsWith('.ts'))
}

export class ArgsHelper<T extends string> {
    originalArgs: T[]
    slicedArgs?: string[]
    sliceAmt: number

    constructor(args: T[], sliceAmt: number) {
        this.originalArgs = args
        this.sliceAmt = sliceAmt
    }

    format = () => { 
        this.slicedArgs = this.originalArgs.slice(this.sliceAmt).map((e: string) => e.replace(/,/g, ''))
        return this.slicedArgs
    }

    asString = (delimiter = ", ") => this.asArray().join(delimiter)
    asArray = () => {
        const format = !this.slicedArgs || this.slicedArgs.length < 1
        return format ? this.format() : this.slicedArgs
    }
}

export const inWorldBorder = (x: number, z: number) => {
    const [numX, numZ] = [x, z]
    return numX >= 33080 || numX < -33280 || 
           numZ >= 16508 || numZ < -16640
}

// Thoroughly tested, faster than both spread and concat w/ high No. of items.
export const fastMerge = <T>(original: T[], args: T[]) => {
    // eslint-disable-next-line prefer-spread
    original.push.apply(original, args)
    return original
}

// Fast merge, but convert to set and back to ensure duplicates are removed.
//export const fastMergeUnique = <T>(original: T[], args: T[]) => removeDuplicates(fastMerge(original, args))

export const fastMergeByKey = <T>(original: T[], arr: T[], key: string) => {
    const len = arr.length
    for (let i = 0; i < len; i++) {
        const cur = arr[i]
        fastMerge(original, cur[key])
    }

    return original
}

export const listInputToArr = (str: string) => str.replace(/,/g, ' ').split(' ').filter(Boolean)
export const removeDuplicates = <T>(arr: T[]) => [...new Set(arr)]

// The unary plus operator here coerces the value into a number.
// This apparentely mitigates some pitfalls of `isNaN()` and should be more reliable.
export const isNumeric = <T>(val: T) => Number.isFinite(+val)
export const safeParseInt = (num: number | string) => typeof num === "number" ? num : parseInt(num)

/**
 * Inserts three backticks on either end of a string.\
 * Shortform for "\`\`\`someString\`\`\`" in Discord, but avoids us escaping them for JS every time.
 * @param value
 */
export const backticks = <T extends string>(value: T) => `\`\`\`${value}\`\`\`` as const
export const backtick = (value: string | number, opts?: { prefix?: string, postfix?: string }) => {
    return `${opts?.prefix ?? ""}\`${value.toString()}\`${opts?.postfix ?? ""}` as const
}

export function embedField(name: string, value: string, inline = false): APIEmbedField {
    return { name, value, inline }
}

// TODO: Customizing params to make player face left reduces image quality,
//       consider mirroring it after and sending it as a local discord `File`.
export const buildSkinURL = (opts: SkinOpts) => {
    const domain = "https://vzge.me/"
    const params = `y=${opts.yaw ?? 0}&p=${opts.pitch ?? 0}&r=${opts.roll ?? 0}`

    // Ex: domain/bust/256/uuid.png?y=0&p=0&r=0
    return `${domain}${opts.view}/${opts.size ?? 256}/${opts.subject}.png?${params}` as const
}