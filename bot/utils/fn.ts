import type { DBAlliance } from "../types.js"

import type { 
    Channel, Message,
    MessageReaction,
    ButtonInteraction,
    Client,
    CommandInteraction,
    EmojiIdentifierResolvable,
    User,
    APIEmbedField,
    APIActionRowComponent,
    APIMessageActionRowComponent
} from "discord.js"

import {
    ButtonBuilder, EmbedBuilder,
    ActionRowBuilder, AttachmentBuilder,
    ChannelType, ComponentType,
    Colors, ButtonStyle,
    PermissionFlagsBits
} from "discord.js"

import { OfficialAPI, type RawPlayerV3 } from "earthmc"

import { request } from "undici"
import { Timestamp } from "firebase-admin/firestore"

import moment from "moment"
import fs from 'fs'
import path from "path"

export const botDevs = ["Owen3H", "263377802647175170"]

export let queueSubbedChannelArray: string[] = []
export const setQueueSubbedChannels = (arr: string[]) => queueSubbedChannelArray = arr

export let newsSubbedChannelArray: string[] = []
export const setNewsSubbedChannels = (arr: string[]) => newsSubbedChannelArray = arr

export let townlessSubbedChannelArray: string[] = []
export const setTownlessSubbedChannels = (arr: string[]) => townlessSubbedChannelArray = arr

export const errorEmbed = (title: string, desc: string) => new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(Colors.Red)
    .setTimestamp()

export const serverIssues = errorEmbed("Server Issues", "We are currently unable to reach EarthMC, it's most likely down.")
export const townyIssues = errorEmbed("Towny Issues", "We are currently unable to fetch Towny data, try again later!" )
export const dynmapIssues = errorEmbed("Dynmap Issues", "We are currently unable to fetch Dynmap data, try again later!")
export const databaseError = errorEmbed("Database Error", "An error occurred requesting custom database info!")
export const fetchError = errorEmbed("Fetch Error", "Unable to fetch required data, please try again!")

// TODO: Use this list instead for future-proofing -> https://github.com/jwkerr/staff/blob/master/staff.json
// Since it uses UUIDs, the OAPI will need to be used to grab the names.
// export const staff = {
//     all: () => fastMerge(staff.active, staff.inactive),
//     active: [
//         "Fix", "KarlOfDuty", "CorruptedGreed", "1212ra", "PolkadotBlueBear", "RlZ58", "Ebola_chan",
//         "Fruitloopins", "Shia_Chan", "Professor__Pro", "Barbay1", "WTDpuddles", "Coblobster",
//         "aas5aa_OvO", "Fijiloopins", "Masrain", "linkeron1", "Warriorrr", "AD31", "Proser",
//         "Fu_Mu", "Mednis", "yellune", "XxSlayerMCxX", "32Andrew", "KeijoDPutt", "SuperHappyBros", 
//         "knowlton", "32Basileios", "Shirazmatas", "YellowVictini", "UncleSn", "Zackaree", "_Precise_",
//         "cactusinapumpkin", "Arkbomb", "Hodin", "BusDuster", "RoseBrugs", "FBI_Bro"
//     ],
//     inactive: [
//         "Mihailovic", "kiadmowi", "Scorpionzzx",
//         "BigshotWarrior", "TheAmazing_Moe", "jkmartindale"
//     ]
// }

interface StaffResponse {
    owner: string[]
    admin: string[]
    developer: string[]
    staffmanager: string[]
    moderator: string[]
    helper: string[]
}

interface StaffMember {
    player: RawPlayerV3
    role: string
}

export const getStaff = async (): Promise<StaffMember[]> => {
    const res = await request("https://raw.githubusercontent.com/jwkerr/staff/master/staff.json")
        .then(res => res.body.json()) as StaffResponse

    const staffUuids = Object.values(res).flat()
    const staff = await OfficialAPI.V3.players(...staffUuids)

    // TODO: Store in DB in case OAPI goes down.
    // Re-associate the roles with the UUID and also provide the name.
    return staff.map(player => {
        const role = Object.keys(res).find(key => res[key].includes(player.uuid)) ?? "Unknown"
        const sm: StaffMember = { 
            player,
            role
        }

        return sm
    })
}

export const staffListEmbed = (client: Client, arr: string[], active = true) => new EmbedBuilder({
    title: `Staff List (${active ? "Active" : "Inactive"})`,
    description: sortAlphabetical(arr).join(", "),
    footer: devsFooter(client),
    color: Colors.Green
}).setThumbnail(client.user.avatarURL()).setTimestamp()

export const auroraNationBonus = (residentAmt: number) => residentAmt >= 200 ? 100
    : residentAmt >= 120 ? 80
    : residentAmt >= 80 ? 60
    : residentAmt >= 60 ? 50
    : residentAmt >= 40 ? 30
    : residentAmt >= 20 ? 10 : 0

export const novaNationBonus = (residentAmt: number) => residentAmt >= 60 ? 140
    : residentAmt >= 40 ? 100
    : residentAmt >= 30 ? 60
    : residentAmt >= 20 ? 40
    : residentAmt >= 10 ? 20
    : residentAmt < 10 ? 10 : 0

export const NOVA = {
    thumbnail: attachmentFromFile('/bot/images/nova.png', 'nova.png'),
    newsChannel: "970962923285540915"
}

export const AURORA = {
    thumbnail: attachmentFromFile('/bot/images/aurora.png', 'aurora.png'),
    newsChannel: "970962878486183958"
}

export const time = (date = moment()) => moment(date).utc().format("YYYY/MM/DD HH:mm:ss")

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

export function unixFromDate(date: Date | Timestamp): number {
    let result: Date = null

    if (date instanceof Timestamp) result = new Date(date["seconds"] * 1000)
    else if (date instanceof Date) result = date
    
    return result ? moment.utc(result).unix() : null
}

export const fiveMin = 5 * 60 * 1000
export const listInputToArr = (str: string) => str.replace(/,/g, ' ').split(' ').filter(Boolean)
export const removeDuplicates = <T>(arr: T[]) => [...new Set(arr)]
export const getUserCount = (client: Client) => client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)

//export const deepCopy = <T>(arr: T[]) => JSON.parse(JSON.stringify(arr))
//export const isEmpty = (str: string) => (!str || str.length === 0)

// type ForwardCallback = (
//     interaction: ButtonInteraction, 
//     msg: Message,
//     embeds: EmbedBuilder[]
// ) => Awaitable<any>

export const paginator = async(
    author: string, 
    msg: Message, 
    embeds: EmbedBuilder[], 
    currentPage: number
    // TODO: Implement this. For running specified method on fwd/back.
    // _forward: ForwardCallback
) => {
    // DM messages don't work with component collectors right now
    if (msg?.channel?.type == ChannelType.DM) {
        return await msg.edit("DMs do not support buttons yet! Try again in a server.")
    }

    // Create collector which will listen for a button interaction. (If it passes the filter)
    const collector = msg.createMessageComponentCollector({ 
        filter: (i: ButtonInteraction) => { 
            i.deferUpdate()
            return i.user.id === author // Only the original sender is allowed to press buttons.
        },
        componentType: ComponentType.Button,
        time: fiveMin
    })

    const lastPage = embeds.length - 1

    // Edit message to show arrow buttons
    await msg.edit({ components: [buildButtons(currentPage, lastPage)] }).catch(console.error)
    setTimeout(() => msg.edit({ components: [] }).catch(() => {}), fiveMin)

    collector.on("collect", async interaction => {
        currentPage = interaction.customId == "last" ? lastPage 
            : interaction.customId == "back" ? Math.max(currentPage - 1, 0) 
            : interaction.customId == "forward" ? Math.min(currentPage + 1, lastPage) : 0

        await msg.edit({
            embeds: [embeds[currentPage]],
            components: [buildButtons(currentPage, lastPage)]
        })
    })
}

/** Helper method to create a paginator on an interaction. */
export const paginatorInteraction = async(
    interaction: CommandInteraction | ButtonInteraction,
    embeds: EmbedBuilder[],
    currentPage: number
) => {
    try {
        const msg: Message = await interaction.fetchReply()
        if (!msg) throw new Error("Received null from fetchReply")

        paginator(interaction.user.id, msg, embeds, currentPage)
    } catch(e) {
        console.warn("Failed to paginate. Message could not be fetched from interaction.\n" + e)
    }
}

const buildButtons = (currentPage: number, lastPage: number) => {
    const noFurther = currentPage >= lastPage
    const noLess = currentPage <= 0

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        emojiButton("first", "⏪", noLess), emojiButton("back", "◀", noLess), 
        emojiButton("forward", "▶", noFurther), emojiButton("last", "⏩", noFurther)
    ).toJSON() as APIActionRowComponent<APIMessageActionRowComponent>
}

const emojiButton = (
    id: string, 
    emoji: EmojiIdentifierResolvable, 
    disabled: boolean
) => new ButtonBuilder({
    customId: id,
    emoji: emoji,
    disabled: disabled,
    style: ButtonStyle.Primary
})

const reactionOpts = {
    time: fiveMin, 
    max: 1, 
    errors: ['time']
}

export const paginatorDM  = async (
    author: string,
    msg: Message,
    embeds: EmbedBuilder[], 
    curPage: number, 
    addReactions = true
) => {
    if (addReactions) {
        await msg.react("⏪")
        await msg.react("◀")
        await msg.react("▶")
        await msg.react("⏩")

        setTimeout(() => msg.reactions.removeAll().catch(() => {}), fiveMin)
    }

    const filter = (reaction: MessageReaction, user: User) => {
        return user.id == author && ["◀", "▶", "⏪", "⏩"].includes(reaction.emoji.name)
    }

    const reaction = await msg.awaitReactions({ filter, ...reactionOpts }).catch(() => {})
    if (!reaction) return msg.reactions.removeAll().catch(() => {})

    switch (reaction.first().emoji.name) {
        case "◀": {
            const m = await msg.edit({ embeds: [embeds[Math.max(curPage - 1, 0)]] })
            paginatorDM(author, m, embeds, Math.max(curPage - 1, 0), false)

            break
        }
        case "▶": {
            const m = await msg.edit({ embeds: [embeds[Math.min(curPage + 1, embeds.length - 1)]] })
            paginatorDM(author, m, embeds, Math.min(curPage + 1, embeds.length - 1), false)

            break
        }
        case "⏪": {
            const m = await msg.edit({ embeds: [embeds[0]] })
            paginatorDM(author, m, embeds, 0, false)

            break
        }
        case "⏩": {
            const m = await msg.edit({ embeds: [embeds[embeds.length - 1]] })
            paginatorDM(author, m, embeds, embeds.length - 1, false)

            break
        }
    }
}

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

const len = (x: any[]) => x.length
export const defaultSort = <V extends object>(arr: V[]) => sortByOrder(arr, [{
    key: 'residents',
    callback: len
}, {
    key: 'area'
}, {
    key: 'name',
    callback: (k: string) => k.toLowerCase()
}])

export const defaultSortAlliance = (arr: DBAlliance[]) => sortByOrder(arr, [{ 
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

export const random = (array: any[], last: number) => {
    const len = array.length
    while(true) {
        const rand = Math.floor(Math.random() * len)
        if (rand != last) return rand
    }
}

/** Checks whether the client can view and send messages in a channel */
export function canViewAndSend(channel: Channel) {
    switch (channel.type) {
        case ChannelType.GuildText:
        case ChannelType.GuildAnnouncement: {
            if (!channel.viewable) return false
            return channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.SendMessages)
        }
        case ChannelType.AnnouncementThread:
        case ChannelType.PublicThread:
        case ChannelType.PrivateThread: {
            return channel.joinable && channel.sendable
        }
        default: return false
    }
}

export const secToMs = (ts: number) => Math.round(ts / 1000)
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
    original: T[]
    spliced: string[] = []
    
    spliceAmt: number

    constructor(args: T[], spliceAmt: number) {
        this.original = args
        this.spliceAmt = spliceAmt
    }

    format = () => { 
        this.spliced = this.original.splice(this.spliceAmt).map((e: string) => e.replace(/,/g, ''))
        return this.spliced
    }

    asArray = () => this.spliced?.length < 1 ? this.format() : this.spliced
    asString = (delimiter = ", "): string => this.asArray().join(delimiter)
}

export const inWorldBorder = (x: number, z: number) => {
    const [numX, numZ] = [x, z]
    return numX >= 33080 || numX < -33280 || 
           numZ >= 16508 || numZ < -16640
}

// Thoroughly tested, faster than both spread and concat w/ high No. of items.
export const fastMerge = <T>(original: T[], args: any[]) => {
    // eslint-disable-next-line prefer-spread
    original.push.apply(original, args)
    return original
}

// Fast merge, but convert to set and back to ensure duplicates are removed.
export const fastMergeUnique = <T>(original: T[], args: any[]) => [...new Set(fastMerge(original, args))]

export const fastMergeByKey = <T>(original: T[], arr: any[], key: string) => {
    const len = arr.length
    for (let i = 0; i < len; i++) {
        const cur = arr[i]
        fastMerge(original, cur[key])
    }

    return original
}

// The unary plus operator here coerces the value into a number.
// This apparentely mitigates some pitfalls of `isNaN()` and should be more reliable.
export const isNumeric = <T>(val: T) => Number.isFinite(+val)
export const safeParseInt = (num: number | string) => typeof num === "number" ? num : parseInt(num)

/**
 * Inserts three backticks on either end of a string.\
 * Shortform for "\`\`\`someString\`\`\`" in Discord, but avoids us escaping them for JS every time.
 * @param value
 */
export const backticks = <T extends string>(value: T): `\`\`\`${T}\`\`\`` => `\`\`\`${value}\`\`\``
export const backtick = (value: string | number, opts?: { prefix?: string, postfix?: string }) => {
    return `${opts?.prefix ?? ""}\`${value.toString()}\`${opts?.postfix ?? ""}`
}

export function embedField(name: string, value: string, inline = false): APIEmbedField {
    return { name, value, inline }
}