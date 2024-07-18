import type { 
    Channel, Message,
    MessageReaction,
    ButtonInteraction,
    Client,
    CommandInteraction,
    EmojiIdentifierResolvable,
    User,
    APIEmbedField
} from "discord.js"

import {
    ButtonBuilder, EmbedBuilder,
    ActionRowBuilder, AttachmentBuilder,
    ChannelType, ComponentType,
    Colors, ButtonStyle,
    PermissionFlagsBits
} from "discord.js"

import moment from "moment"
import { Timestamp } from "firebase-admin/firestore"

import fs from 'fs'
import { request } from "undici"
import path from "path"

const botDevs = ["Owen3H", "263377802647175170"]

// eslint-disable-next-line
let queueSubbedChannelArray: string[] = []
const setQueueSubbedChannels = (arr: string[]) => queueSubbedChannelArray = arr

// eslint-disable-next-line
let newsSubbedChannelArray: string[] = []
const setNewsSubbedChannels = (arr: string[]) => newsSubbedChannelArray = arr

// eslint-disable-next-line
let townlessSubbedChannelArray: string[] = []
const setTownlessSubbedChannels = (arr: string[]) => townlessSubbedChannelArray = arr

const errorEmbed = (title: string, desc: string) => new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(Colors.Red)
    .setTimestamp()

const serverIssues = errorEmbed("Server Issues", "We are currently unable to reach EarthMC, it's most likely down.")
const townyIssues = errorEmbed("Towny Issues", "We are currently unable to fetch Towny data, try again later!" )
const dynmapIssues = errorEmbed("Dynmap Issues", "We are currently unable to fetch Dynmap data, try again later!")
const databaseError = errorEmbed("Database Error", "An error occurred requesting custom database info!")
const fetchError = errorEmbed("Fetch Error", "Unable to fetch required data, please try again!")

const embedField = (name: string, value: string, inline = false): APIEmbedField => ({ name, value, inline })

// TODO: Use this list instead for future-proofing -> https://github.com/jwkerr/staff/blob/master/staff.json
// Since it uses UUIDs, the OAPI will need to be used to grab the names.
const staff = {
    all: () => fastMerge(staff.active, staff.inactive),
    active: [
        "Fix", "KarlOfDuty", "CorruptedGreed", "1212ra", "PolkadotBlueBear", "RlZ58", "Ebola_chan",
        "Fruitloopins", "Shia_Chan", "Professor__Pro", "Barbay1", "WTDpuddles", "Coblobster",
        "aas5aa_OvO", "Fijiloopins", "Masrain", "linkeron1", "Warriorrr", "AD31", "Proser",
        "Fu_Mu", "Mednis", "yellune", "XxSlayerMCxX", "32Andrew", "KeijoDPutt", "SuperHappyBros", 
        "knowlton", "32Basileios", "Shirazmatas", "YellowVictini", "UncleSn", "Zackaree", "_Precise_",
        "cactusinapumpkin", "Arkbomb", "Hodin", "BusDuster", "RoseBrugs", "FBI_Bro"
    ],
    inactive: [
        "Mihailovic", "kiadmowi", "Scorpionzzx",
        "BigshotWarrior", "TheAmazing_Moe", "jkmartindale"
    ]
}

const staffListEmbed = (client: Client, arr: string[], active = true) => new EmbedBuilder({
    title: `Staff List (${active ? "Active" : "Inactive"})`,
    description: alphabetSort(arr).join(", "),
    footer: devsFooter(client),
    color: Colors.Green
}).setThumbnail(client.user.avatarURL()).setTimestamp()

const auroraNationBonus = (residentAmt: number) => residentAmt >= 200 ? 100
    : residentAmt >= 120 ? 80
    : residentAmt >= 80 ? 60
    : residentAmt >= 60 ? 50
    : residentAmt >= 40 ? 30
    : residentAmt >= 20 ? 10 : 0

const novaNationBonus = (residentAmt: number) => residentAmt >= 60 ? 140
    : residentAmt >= 40 ? 100
    : residentAmt >= 30 ? 60
    : residentAmt >= 20 ? 40
    : residentAmt >= 10 ? 20
    : residentAmt < 10 ? 10 : 0

const NOVA = {
    thumbnail: attachmentFromFile('/bot/images/nova.png', 'nova.png'),
    newsChannel: "970962923285540915"
}

const AURORA = {
    thumbnail: attachmentFromFile('/bot/images/aurora.png', 'aurora.png'),
    newsChannel: "970962878486183958"
}

const time = (date = moment()) => moment(date).utc().format("YYYY/MM/DD HH:mm:ss")

const error = (client: Client, message: string, error: string) => new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle(message)
    .setDescription(`${error}`)
    .setFooter({ text: client.user.username, iconURL: client.user.avatarURL() })
    .setTimestamp()

const devsFooter = (client: Client) => ({
    text: `Maintained by ${botDevs[0]}`, 
    iconURL: client.user.avatarURL()
})

function unixFromDate(date: Date | Timestamp): number {
    let result: Date = null

    if (date instanceof Timestamp) result = new Date(date["seconds"] * 1000)
    else if (date instanceof Date) result = date
    
    return result ? moment.utc(result).unix() : null
}

const removeDuplicates = (arr: any[]) => [...new Set(arr)]
const deepCopy = (arr: any[]) => JSON.parse(JSON.stringify(arr))
const getUserCount = (client: Client) => client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)
const isEmpty = (str: string) => (!str || str.length === 0)
const fiveMin = 5 * 60 * 1000

const paginator = async(
    author: string, 
    msg: Message, 
    embedArr: EmbedBuilder[], 
    currentPage: number
) => {   
    // DM messages don't work with component collectors right now
    if (msg?.channel?.type == ChannelType.DM) 
        return await msg.edit("DMs do not support buttons yet! Try again in a server.")

    // Create collector which will listen for a button interaction. (If it passes the filter)
    const filter = (i: ButtonInteraction) => { 
        i.deferUpdate()
        return i.user.id === author
    }

    const collector = msg.createMessageComponentCollector({ 
        filter, componentType: ComponentType.Button,
        time: fiveMin
    })

    const lastPage = embedArr.length - 1

    // Edit message to show arrow buttons
    await msg.edit({ components: [await buildButtons(currentPage, lastPage)] }).catch(() => {})
    setTimeout(() => msg.edit({ components: [] }).catch(() => {}), fiveMin)

    // Decide what page to display according to the button interaction
    collector.on("collect", async interaction => {
        currentPage = interaction.customId == "last" ? lastPage 
            : interaction.customId == "back" ? Math.max(currentPage - 1, 0) 
            : interaction.customId == "forward" ? Math.min(currentPage + 1, lastPage) : 0

        await msg.edit({
            embeds: [embedArr[currentPage]],
            components: [await buildButtons(currentPage, lastPage)]
        })
    })
}

/** Helper method to create a paginator on an interaction. */
const paginatorInteraction = async(
    interaction: CommandInteraction,
    embeds: EmbedBuilder[],
    currentPage: number
) => {
    const msg = await interaction.fetchReply().catch(console.log) as Message
    paginator(interaction.user.id, msg, embeds, currentPage)
}

async function buildButtons(currentPage: number, lastPage: number) {
    const noFurther = currentPage >= lastPage
    const noLess = currentPage <= 0

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        emojiButton("first", "⏪", noLess), emojiButton("back", "◀", noLess), 
        emojiButton("forward", "▶", noFurther), emojiButton("last", "⏩", noFurther)
    )
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

const paginatorDM  = async (
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
const daysBetween = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime()
    return Math.ceil(diff / (1000 * 3600 * 24))
}

function divideArray(arr: any[], n: number) {
    const chunks = []

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

const alphabetSort = (arr: any[], key?: string) => arr.sort((a, b) => {
    const aVal = (key ? a[key] : a).toLowerCase()
    const bVal = (key ? a[key] : b).toLowerCase()

    return (bVal < aVal) ? 1 : (bVal > aVal ? -1 : 0)
})

const sortByKey = (arr: any[], key: string) => {
    arr.sort(function(a, b) {
        const [aKey, bKey] = [a[key].toLowerCase(), b[key].toLowerCase()]

        if (aKey < bKey) return -1
        if (aKey > bKey) return 1
        
        return 0
    })

    return arr
}

function sortByOrder(arr: any[], keys: { key: string, callback?: any }[], ascending = false) {
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
const defaultSort = (arr: any[]) => sortByOrder(arr, [{
    key: 'residents',
    callback: len
}, {
    key: 'area'
}, {
    key: 'name',
    callback: (k: string) => k.toLowerCase()
}])

const defaultSortAlliance = (arr: any[]) => sortByOrder(arr, [{ 
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

const maxTownSize = 940

function attachmentFromFile(absolutePath: string, name: string, description?: string) {
    const file = fs.readFileSync(process.cwd() + absolutePath)
    return new AttachmentBuilder(file, description ? { name, description } : { name })
}

const random = (array: any[], last: number) => {
    const len = array.length
    while(true) {
        const rand = Math.floor(Math.random() * len)
        if (rand != last) return rand
    }
}

/** Checks whether the client can view and send messages in a channel */
function canViewAndSend(channel: Channel) {
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

const secToMs = (ts: number) => Math.round(ts / 1000)
const jsonReq = (url: string) => request(url).then(res => res.body.json()).catch(() => {})

const readTsFiles = (str: string) => {
    const fullPath = path.join(path.resolve(process.cwd(), `./${str}`))
    return fs.readdirSync(fullPath).filter(file => file.endsWith('.ts'))
}

function argsHelper(args: string[], spliceAmt: number) {
    return {
        original: args,
        spliced: [] as string[],
        format: function() { 
            this.spliced = this.original.splice(spliceAmt).map((e: string) => e.replace(/,/g, ''))
            return this.spliced
        },
        asArray: function() { return this.spliced?.length < 1 ? this.format() : this.spliced },
        asString: function(delimiter = ", ") { return this.asArray().join(delimiter) }
    }
}

const inWorldBorder = (x: number, z: number) => {
    const [numX, numZ] = [x, z]
    return numX >= 33081 || numX < -33280 || 
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

export {
    jsonReq,
    readTsFiles,
    maxTownSize,
    time,
    error,
    paginator,
    paginatorDM,
    daysBetween,
    botDevs,
    removeDuplicates,
    deepCopy,
    isEmpty,
    getUserCount,
    queueSubbedChannelArray,
    newsSubbedChannelArray,
    townlessSubbedChannelArray,
    townyIssues,
    fetchError,
    databaseError,
    serverIssues,
    dynmapIssues,
    paginatorInteraction,
    divideArray,
    unixFromDate,
    devsFooter,
    staff,
    staffListEmbed,
    alphabetSort,
    sortByKey,
    sortByOrder,
    defaultSort,
    defaultSortAlliance, 
    attachmentFromFile,
    novaNationBonus,
    auroraNationBonus,
    random,
    canViewAndSend,
    NOVA,
    AURORA,
    embedField,
    secToMs,
    setQueueSubbedChannels,
    setNewsSubbedChannels,
    setTownlessSubbedChannels,
    argsHelper,
    inWorldBorder
}
