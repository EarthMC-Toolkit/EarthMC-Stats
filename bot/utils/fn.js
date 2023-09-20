const Discord = require("discord.js"),
      moment = require("moment"),
      admin = require("firebase-admin")
  
const botDevs = ["Owen3H#5737", "263377802647175170"]

// eslint-disable-next-line
let queueSubbedChannelArray = []
// eslint-disable-next-line
let newsSubbedChannelArray = []
// eslint-disable-next-line
let townlessSubbedChannelArray = []

/**
 * @param { string } title 
 * @param { string } desc 
 * @returns { Discord.MessageEmbed }
 */
const errorEmbed = (title, desc) => new Discord.MessageEmbed()
    .setTitle(title)
    .setDescription(desc)
    .setColor("RED")
    .setTimestamp()

const serverIssues = errorEmbed("Server Issues", "We are currently unable to reach EarthMC, it's most likely down."),
      townyIssues = errorEmbed("Towny Issues","We are currently unable to fetch Towny data, try again later!" ),
      dynmapIssues = errorEmbed("Dynmap Issues", "We are currently unable to fetch Dynmap data, try again later!"),
      databaseError = errorEmbed("Database Error", "An error occurred requesting custom database info!"),
      fetchError = errorEmbed("Fetch Error", "Unable to fetch required data, please try again!")

const embedField = (name, value, inline) => ({ name, value, inline })
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

/**
* @param { Discord.Client} client
* @param { string[] } arr
*/
const staffListEmbed = (client, arr, active = true) => new Discord.MessageEmbed({
    title: `Staff List (${active ? "Active" : "Inactive"})`,
    description: alphabetSort(arr).join(", "),
    thumbnail: client.user.avatarURL(),
    footer: devsFooter(client),
    color: "GREEN",
}).setTimestamp()

const auroraNationBonus = residentAmt => residentAmt >= 120 ? 80
    : residentAmt >= 80 ? 60
    : residentAmt >= 60 ? 50
    : residentAmt >= 40 ? 30
    : residentAmt >= 20 ? 10 : 0

const novaNationBonus = residentAmt => residentAmt >= 60 ? 140
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

const error = (client, message, error) => {
    return new Discord.MessageEmbed()
        .setColor("RED")
        .setTitle(message)
        .setDescription(`${error}`)
        .setFooter({text: client.user.username, iconURL: client.user.avatarURL()})
        .setTimestamp()
}

const devsFooter = (client) => ({
    text: `Maintained by ${botDevs[0]}`, 
    iconURL: client.user.avatarURL()
})

function unixFromDate(date) {
    var result = null

    if (date instanceof admin.firestore.Timestamp) result = new Date(date["seconds"] * 1000)
    else if (date instanceof Date) result = date
    
    if (result != null) return moment.utc(result).unix()
    return result
}

const removeDuplicates = arr => [...new Set(arr)],
      deepCopy = (arr) => JSON.parse(JSON.stringify(arr)),
      getUserCount = (client) => client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
      isEmpty = (str) => (!str || str.length === 0)

/**
 * @param {String} author
 * @param {Discord.Message} msg
 * @param {Discord.MessageEmbed[]} embedArr
 * @param {Number} currentPage
 */
const paginator = async (author, msg, embedArr, currentPage) => {   
    // DM messages don't work with component collectors right now
    if (msg?.channel?.type == "DM") return await msg.edit("DMs do not support buttons yet! Try again in a server.")

    // Create collector which will listen for a button interaction. (If it passes the filter)
    const filter = i => { 
        i.deferUpdate() 
        return i.user.id === author 
    }
          
    const collector = msg.createMessageComponentCollector({ filter, componentType: 'BUTTON', time: 5*60*1000 }),
          lastPage = embedArr.length-1

    // Edit message to show arrow buttons
    await msg.edit({components: [await buildButtons(currentPage, lastPage)]}).catch(() => {})
    setTimeout(() => msg.edit({components: []}).catch(() => {}), 5*60*1000)

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
 * @param {Discord.CommandInteraction} interaction
 * @param {Discord.MessageEmbed[]} embeds
 * @param {number} currentPage
 */
const paginatorInteraction = async (interaction, embeds, currentPage) => {
    const msg = await interaction.fetchReply().catch(console.log)
    paginator(interaction.user.id, msg, embeds, currentPage)
}

async function buildButtons(currentPage, lastPage) {
    const noFurther = currentPage >= lastPage,
          noLess = currentPage <= 0

    return new Discord.MessageActionRow().addComponents(
        emojiButton("first", "⏪", noLess), emojiButton("back", "◀", noLess), 
        emojiButton("forward", "▶", noFurther), emojiButton("last", "⏩", noFurther)
    )
}

const emojiButton = (id, emoji, disabled) => new Discord.MessageButton({
    customId: id,
    emoji: emoji,
    disabled: disabled,
    style: "PRIMARY"
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
const daysBetween = (start, end) => {
    const diff = end.getTime() - start.getTime()
    return Math.ceil(diff / (1000 * 3600 * 24))
}

function divideArray(arr, n) {
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

const alphabetSort = (arr, key) => arr.sort((a, b) => {
    const aVal = (key ? a[key] : a).toLowerCase(),
          bVal = (key ? a[key] : b).toLowerCase()

    return (bVal < aVal) ? 1 : (bVal > aVal ? -1 : 0)
})

function defaultSort(arr) {
    arr.sort((a, b) => {
        if (b.residents.length > a.residents.length) return 1
        if (b.residents.length < a.residents.length) return -1

        if (b.area > a.area) return 1
        if (b.area < a.area) return -1

        if (b.name.toLowerCase() < a.name.toLowerCase()) return 1
        if (b.name.toLowerCase() > a.name.toLowerCase()) return -1

        return 0
    })

    return arr
}

const maxTownSize = 940

function attachmentFromFile(absolutePath, name) {
    const fs = require('fs')
    const file = fs.readFileSync(process.cwd() + absolutePath)
    return new Discord.MessageAttachment(file, name)
}

const random = (array, last) => {
    const len = array.length
    while(true) {
        const rand = Math.floor(Math.random() * len)
        if (rand != last) return rand
    }
}

/**
 * Checks whether the client can view and send messages in a channel
 * @param { Discord.AnyChannel } channel 
 */
 function canViewAndSend(channel) {
    switch (channel.type) {
        case "GUILD_TEXT":
        case "GUILD_NEWS": return channel.viewable && channel.permissionsFor(channel.guild.members.me).has('SEND_MESSAGES')
        case "GUILD_NEWS_THREAD":
        case "GUILD_PUBLIC_THREAD":
        case "GUILD_PRIVATE_THREAD": return channel.joinable && channel.sendable
        default: return false
    }
}

const secToMs = ts => Math.round(ts / 1000)

module.exports = {
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
    defaultSort, 
    attachmentFromFile,
    novaNationBonus,
    auroraNationBonus,
    random,
    canViewAndSend,
    NOVA,
    AURORA,
    embedField,
    secToMs
}
