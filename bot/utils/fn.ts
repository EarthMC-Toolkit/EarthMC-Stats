import Discord, {ButtonBuilder} from "discord.js"
import moment from "moment"
import admin from "firebase-admin"

import fs from 'fs'
import { request } from "undici"
import path from "path"

const botDevs = ["Owen3H#5737", "263377802647175170"]

// eslint-disable-next-line
let queueSubbedChannelArray: string[] = []
const setQueueSubbedChannels = (arr: string[]) => queueSubbedChannelArray = arr

// eslint-disable-next-line
let newsSubbedChannelArray: string[] = []
const setNewsSubbedChannels = (arr: string[]) => newsSubbedChannelArray = arr

// eslint-disable-next-line
let townlessSubbedChannelArray: string[] = []
const setTownlessSubbedChannels = (arr: string[]) => townlessSubbedChannelArray = arr

const errorEmbed = (title: string, desc: string) => new Discord.EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(Discord.Colors.Red)
    .setTimestamp()

const serverIssues = errorEmbed("Server Issues", "We are currently unable to reach EarthMC, it's most likely down."),
      townyIssues = errorEmbed("Towny Issues","We are currently unable to fetch Towny data, try again later!" ),
      dynmapIssues = errorEmbed("Dynmap Issues", "We are currently unable to fetch Dynmap data, try again later!"),
      databaseError = errorEmbed("Database Error", "An error occurred requesting custom database info!"),
      fetchError = errorEmbed("Fetch Error", "Unable to fetch required data, please try again!")

const embedField = (name, value, inline = false) => ({ name, value, inline })
const staff = {
    inactive: [
        "Mihailovic", "FBI_Bro", "cactusinapumpkin", "Zackaree", 
        "BusDuster", "kiadmowi", "_Precise_", "Shirazmatas", "RoseBrugs", "Scorpionzzx",
        "BigshotWarrior", "TheAmazing_Moe", "MaddieMao", "jkmartindale", "JaVolimKatarinu"
    ],
    active: [
        "Fix", "KarlOfDuty", "CorruptedGreed", "1212ra", "PolkadotBlueBear", "RlZ58", "Ebola_chan",
        "Fruitloopins", "Shia_Chan", "Professor__Pro", "Barbay1","WTDpuddles", "Coblobster",
        "aas5aa_OvO", "Fijiloopins", "Masrain", "linkeron1", "Warriorrr", "AD31", "Proser",
        "Fu_Mu", "Mednis", "yellune", "XxSlayerMCxX","32Andrew", "KeijoDPutt", "SuperHappyBros", "knowlton"
    ],
    all: () => staff.active.concat(staff.inactive)
}

const staffListEmbed = (client: Discord.Client, arr: string[], active = true) => new Discord.EmbedBuilder({
    title: `Staff List (${active ? "Active" : "Inactive"})`,
    description: alphabetSort(arr).join(", "),
    footer: devsFooter(client),
    color: Discord.Colors.Green,
}).setThumbnail(client.user.avatarURL()).setTimestamp()

const auroraNationBonus = (residentAmt: number) => residentAmt >= 120 ? 80
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

const error = (client: Discord.Client, message: string, error: string) => new Discord.EmbedBuilder()
    .setColor(Discord.Colors.Red)
    .setTitle(message)
    .setDescription(`${error}`)
    .setFooter({ text: client.user.username, iconURL: client.user.avatarURL() })
    .setTimestamp()

const devsFooter = (client: Discord.Client) => ({
    text: `Maintained by ${botDevs[0]}`, 
    iconURL: client.user.avatarURL()
})

function unixFromDate(date: Date | admin.firestore.Timestamp): number {
    let result: Date = null

    if (date instanceof admin.firestore.Timestamp) result = new Date(date["seconds"] * 1000)
    else if (date instanceof Date) result = date
    
    return result ? moment.utc(result).unix() : null
}

const removeDuplicates = (arr: any[]) => [...new Set(arr)],
      deepCopy = (arr: any[]) => JSON.parse(JSON.stringify(arr)),
      getUserCount = (client: Discord.Client) => client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
      isEmpty = (str: string) => (!str || str.length === 0)

const paginator = async(
    author: string, 
    msg: Discord.Message, 
    embedArr: Discord.EmbedBuilder[], 
    currentPage: number
) => {   
    // DM messages don't work with component collectors right now
    if (msg?.channel?.type == Discord.ChannelType.DM) 
        return await msg.edit("DMs do not support buttons yet! Try again in a server.")

    // Create collector which will listen for a button interaction. (If it passes the filter)
    const filter = i => { 
        i.deferUpdate() 
        return i.user.id === author 
    }
          
    const collector = msg.createMessageComponentCollector({ filter, componentType: Discord.ComponentType.Button, time: 5*60*1000 }),
          lastPage = embedArr.length-1

    // Edit message to show arrow buttons
    await msg.edit({ components: [await buildButtons(currentPage, lastPage)] }).catch(() => {})
    setTimeout(() => msg.edit({ components: [] }).catch(() => {}), 5*60*1000)

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

/**
 * Helper method to create a paginator on an interaction.
 */
const paginatorInteraction = async(
    interaction: Discord.CommandInteraction, 
    embeds: Discord.EmbedBuilder[], 
    currentPage: number
) => {
    const msg = await interaction.fetchReply().catch(console.log) as Discord.Message
    paginator(interaction.user.id, msg, embeds, currentPage)
}

async function buildButtons(currentPage: number, lastPage: number) {
    const noFurther = currentPage >= lastPage,
          noLess = currentPage <= 0

    return new Discord.ActionRowBuilder<ButtonBuilder>().addComponents(
        emojiButton("first", "⏪", noLess), emojiButton("back", "◀", noLess), 
        emojiButton("forward", "▶", noFurther), emojiButton("last", "⏩", noFurther)
    )
}

const emojiButton = (
    id: string, 
    emoji: Discord.EmojiIdentifierResolvable, 
    disabled: boolean
) => new Discord.ButtonBuilder({
    customId: id,
    emoji: emoji,
    disabled: disabled,
    style: Discord.ButtonStyle.Primary
})

const paginatorDM = async (author, msg, embeds, pageNow, addReactions = true) => {
    if (addReactions) {
        await msg.react("⏪")
        await msg.react("◀")
        await msg.react("▶")
        await msg.react("⏩")

        setTimeout(() => msg.reactions.removeAll().catch(() => {}), 5*60*1000)
    }

    const reaction = await msg.awaitReactions((r, user) => {
        user.id == author && ["◀","▶","⏪","⏩"].includes(r.emoji.name), 
        { time: 5*60*1000, max:1, errors: ['time'] } 
    }).catch(() => {})

    if (!reaction) return msg.reactions.removeAll().catch(() => {})

    let m = null
    switch (reaction.first().emoji.name) {
        case "◀":
            m = await msg.edit({ embeds: [embeds[Math.max(pageNow-1, 0)]] })
            paginatorDM(author, m, embeds, Math.max(pageNow-1, 0), false)
            break
        case "▶":
            m = await msg.edit({ embeds: [embeds[Math.min(pageNow+1, embeds.length-1)]] })
            paginatorDM(author, m, embeds, Math.min(pageNow+1, embeds.length-1), false)
            break
        case "⏪":
            m = await msg.edit({ embeds: [embeds[0]] })
            paginatorDM(author, m, embeds, 0, false)
            break
        case "⏩":
            m = await msg.edit({ embeds: [embeds[embeds.length-1]] })
            paginatorDM(author, m, embeds, embeds.length-1, false)
            break
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
    const aVal = (key ? a[key] : a).toLowerCase(),
          bVal = (key ? a[key] : b).toLowerCase()

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

const len = x => x.length
const defaultSort = (arr: any[]) => sortByOrder(arr, [{
    key: 'residents',
    callback: len
}, {
    key: 'area'
}, {
    key: 'name',
    callback: k => k.toLowerCase()
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
    return new Discord.AttachmentBuilder(file, description ? { name, description } : { name })
}

const random = (array: any[], last: number) => {
    const len = array.length
    while(true) {
        const rand = Math.floor(Math.random() * len)
        if (rand != last) return rand
    }
}

/**
 * Checks whether the client can view and send messages in a channel
 */
function canViewAndSend(channel: Discord.Channel) {
    switch (channel.type) {
        case Discord.ChannelType.GuildText:
        case Discord.ChannelType.GuildAnnouncement: {
            if (!channel.viewable) return false
            return channel.permissionsFor(channel.guild.members.me).has(Discord.PermissionFlagsBits.SendMessages)
        }
        case Discord.ChannelType.AnnouncementThread:
        case Discord.ChannelType.PublicThread:
        case Discord.ChannelType.PrivateThread: {
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
        spliced: [],
        format: function() { 
            this.spliced = this.original.splice(spliceAmt).map(e => e.replace(/,/g, ''))
            return this.spliced
        },
        asArray: function() { return this.spliced?.length < 1 ? this.format() : this.spliced },
        asString: function(delimiter = ", ") { return this.asArray().join(delimiter) }
    }
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
    argsHelper
}
