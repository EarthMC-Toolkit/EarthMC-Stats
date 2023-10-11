//#region Imports
require("dotenv").config()

const Discord = require('discord.js'),
      fs = require("fs"),
      fn = require("./bot/utils/fn.js"),
      emc = require("earthmc"),
      Queue = require("./bot/objects/Queue")

const prod = process.env.PROD == "true"
//#endregion

//#region Initialize Discord
console.log(prod ? "Running in production." : "Running in maintenance, live functions disabled.")

const Flags = Discord.Intents.FLAGS
const intents = [ 
    Flags.GUILDS, 
    Flags.GUILD_MESSAGES, 
    Flags.GUILD_MEMBERS,
    Flags.DIRECT_MESSAGES, 
    Flags.DIRECT_MESSAGE_REACTIONS
]

const client = new Discord.Client({ intents, allowedMentions: { repliedUser: false } })

client.login(process.env.DISCORD_BOT_TOKEN).then(t => {
    client.slashCommands = new Discord.Collection()
    client.auroraCommands = new Discord.Collection()
    client.novaCommands = new Discord.Collection()

    console.log("Logged into Discord with token: " + t)
}).catch(console.error)
//#endregion

//#region Firebase Setup
const { initializeApp, cert } = require('firebase-admin/app'),
      { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')
      
initializeApp({ credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: JSON.parse(process.env.FIREBASE_PRIVATE_KEY)
    }) 
})
   
const database = require("./bot/utils/database"), // THIS HAS TO BE AFTER initializeApp()
      db = getFirestore()

db.settings({ ignoreUndefinedProperties: true })
//#endregion

//#region Initialize Variables
var api = require("./bot/utils/api"),
    queueSubbedChannels = db.collection("subs").doc("queue"),
    townlessSubbedChannels = db.collection("subs").doc("townless")

const NOVA = { 
    emc: emc.Nova, 
    db: database.Nova 
}

const AURORA = { 
    emc: emc.Aurora, 
    db: database.Aurora 
}
//#endregion

//#region Event Handler
const eventFiles = fs.readdirSync('./bot/events').filter(file => file.endsWith('.js'))

for (const file of eventFiles) {
	const event = require(`./bot/events/${file}`)

	if (event.once) client.once(event.name, (...args) => event.execute(...args)) 
    else client.on(event.name, (...args) => event.execute(...args))
}
//#endregion

//#region Client Events
var lastActivity = -1

client.once('ready', async () => {
    console.log(`${fn.time()} | ${client.user.username} is up!`)
    client.user.setPresence({ activities: [{ name: 'Startup Complete!' }], status: 'online' })

    registerCommands()

    const watchingActivities = [
        `${client.guilds.cache.size} Servers`, 'towns being created.',
        'emctoolkit.vercel.app', 'for Dynmap updates', 
        'for /help', 'nations grow!', 'Wales boat sink'
    ]

    if (prod) {
        console.log("Production enabled, initializing data updates..")
        await initUpdates()

        queueSubbedChannels.get().then(doc => { 
            const { channelIDs } = doc.data()
            fn.queueSubbedChannelArray = channelIDs

            console.log(`${fn.time()} | Queue subbed channels retrieved. Length: ${channelIDs.length}`)
        })

        townlessSubbedChannels.get().then(doc => { 
            const { channelIDs } = doc.data()
            fn.townlessSubbedChannelArray = channelIDs

            console.log(`${fn.time()} | Townless subbed channels retrieved. Length: ${channelIDs.length}`)
        })
    }

    setInterval(() => {
        const randomNum = fn.random(watchingActivities, lastActivity)
        client.user.setActivity(watchingActivities[randomNum], { type: 'WATCHING' })
        lastActivity = randomNum
    }, 30*1000)
})
//#endregion

//#region Call Updates
async function initUpdates() {
    const oneMinute = 60 * 1000

    // Pre-fill everything but news.
    await updateData(true, true, true)
    await updateAPI(false, true)

    setInterval(async () => { 
        await liveQueue() 
        liveTownless()
    }, oneMinute)

    // Send alliances to API.
    setInterval(() => updateAPI(false, true), 3 * oneMinute)

    // Update Aurora every 3 minutes (same as Dynmap)
    setInterval(() => updateData(false, true, false), 3.5 * oneMinute)

    // Update Nova and send API news (for both maps) every 10m.
    setInterval(async () => {
        await updateData(false, false, true)
        await updateAPI(true, false)
    }, 10 * oneMinute)

    // setInterval(async () => {
    //     await updateFallenTowns(AURORA)
    // }, oneMinute)
}

async function updateNews() {
    await api.sendNews(client, 'aurora')
    api.sendNews(client, 'nova')
}

async function updateData(botStarting = false, updateAurora = true, updateNova = false) {
    const pArr = await database.getPlayers(botStarting).catch(() => {})
    const players = pArr ? await purgeInactive(pArr) : []

    if (updateAurora) await updateMap(players, AURORA)
    if (updateNova) await updateMap(players, NOVA)

    if (!botStarting) {
        await updateAlliances(AURORA)
        await updateAlliances(NOVA)
    }
}

/**
 * @param { any[] } players 
 * @param { AURORA | NOVA } map 
 * @returns 
 */
async function updateMap(players, map) {
    await updateMapData(map)

    if (players.length < 1) return
    updatePlayerData(players, map)
}
//#endregion

//#region Helper Methods
/**
 * @param { object } timestamp 
 * @param { Date } now 
 * @returns 
 */
const purged = (timestamp, now) => {
    const loDate = new Date(timestamp.seconds * 1000),
          days = fn.daysBetween(loDate, now)

    return days > 35
}

const latinize = str => emc.formatString(str, true)

async function purgeInactive(pArr) {
    const now = new Date(),
          len = pArr.length

    let i = 0, counter = 0

    //#region Purge loop
    for (i; i < len; i++) {
        const player = pArr[i],
              lo = player?.lastOnline

        if (!lo) {
            pArr.splice(i, 1)
            counter++

            continue
        }

        // Player's discord is null or empty, delete it.
        // If not, don't purge them.
        if (!player?.linkedID) delete player.linkedID
        else continue

        //#region Purge if inactive on both maps.
        if (lo.aurora && !purged(lo.aurora, now)) continue
        if (lo.nova && !purged(lo.nova, now)) continue

        pArr.splice(i, 1)
        counter++
        //#endregion
    }
    //#endregion

    console.log(`Purged ${counter} inactive/corrupted players.`)
    await database.setPlayers(pArr)

    return pArr
}
//#endregion

//#region Database Update Methods
async function updateAPI(news, alliances) {
    if (alliances) await api.sendAlliances()
    if (news) await updateNews()
}

const exists = (name, obj, key='nations') => obj[key].includes(name)

/**
 * @param { AURORA | NOVA } map 
 */
async function updateAlliances(map) {
    const nations = await map.emc.Nations.all()
    if (!nations) return console.warn("Couldn't update " + map + " alliances, failed to fetch nations.")

    map.db.getAlliances(true).then(async alliances => {
        // For each alliance
        alliances.forEach(alliance => {
            if (nations.length > 0) {
                // Filter out nations that do not exist.
                const existing = nations.filter(nation => exists(nation.name, alliance))

                // No nations exist in the alliance anymore, disband it.
                if (existing.length > 1) alliance.nations = existing.map(n => n.name)
                else console.log(`Alliance '${alliance.allianceName}' has no nations.`)
            }

            const noInvite = "No discord invite has been set for this alliance"
            if (alliance.discordInvite == noInvite) return

            // Invalid or will expire, set it back to none.
            client.fetchInvite(alliance.discordInvite)
                .then(inv => { if (inv.maxAge > 0) alliance.discordInvite = noInvite })
                .catch(err => { if (err.code == 10006) alliance.discordInvite = noInvite })
        })

        map.db.setAlliances(alliances)
    })
}

//#region Fallen Towns
var fallenTownCache = []
function updateFallenTownCache(data) { 
    fallenTownCache = data
    console.log(`${fn.time()} | Updated fallen town cache.`)
}

/**
 * @param { AURORA | NOVA } map 
 */
async function updateFallenTowns(map) {
    // const mapData = await map.db.getTownyData()
    // if (!mapData || !mapData.sets["townyPlugin.markerset"]) return

    let townsArray = await map.emc.Towns.all().catch(() => {})
    if (!townsArray) return console.log("Could not update map data! Failed to fetch towns.")

    townsArray = townsArray.map(t => {
        const NPCRegex = /^NPC[0-9]{1,5}$/,
              ruined = (NPCRegex.test(t.mayor) || !t.residents || t.residents == "") ? true : false

        t["ruined"] = ruined
        return t
    })
    
    const townFlowChannel = client.channels.cache.get("1161579122494029834")
          //msgs = await townFlowChannel.messages.fetch()
          //ruinNames = msgs.filter(m => m.embeds[0] != null && m.embeds[0].title.includes("ruined")).map(m => m.embeds[0].fields[0].value)

    // townsArray.forEach(town => {
    //     if (!ruinNames.includes(town.name) && town.ruined) {
    //         const ruinEmbed = new Discord.MessageEmbed()
    //             .setTitle("A town has ruined!")
    //             .addFields(fn.embedField(
    //                 "Town Name", 
    //                 town.name + (town.capital ? " :star:" : ""), 
    //                 true
    //             ))
    //             .setFooter(fn.devsFooter(client))
    //             .setThumbnail(client.user.avatarURL())
    //             .setTimestamp()
    //             .setColor("ORANGE")

    //         const mayor = town.mayor.replace(/_/g, "\\_")
    //         if (mayor) ruinEmbed.addFields(fn.embedField("Mayor", mayor, true))

    //         const [green, red] = ["<:green_tick:1036290473708495028>", "<:red_tick:1036290475012915270>"]
    //         ruinEmbed.addFields(
    //             fn.embedField("Town Size", town.area.toString(), true), 
    //             fn.embedField("Location", `[${town.x}, ${town.z}](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=6&x=${town.x}&y=64&z=${town.z})`, true),
    //             fn.embedField("Flags", `
    //                 ${town.pvp ? green : red } PVP
    //                 ${town.mobs ? green : red } Mobs 
    //                 ${town.public ? green : red } Public
    //                 ${town.explosion ? green : red } Explosions 
    //                 ${town.fire ? green : red } Fire Spread
    //             `)
    //         )

    //         townFlowChannel.send({embeds: [ruinEmbed]})
    //     }
    // })

    // If cache is empty, update it.
    if (fallenTownCache.length < 1) updateFallenTownCache(townsArray)  
    else {
        updateFallenTownCache(townsArray)

        // Create arrays from comparing cache to current
        // Name and mayor have to be changed for it to be "fallen"
        const fallenTowns = fallenTownCache.filter(ft => 
            !townsArray.find(town => town.name == ft.name) && 
            !townsArray.find(town => town.mayor == ft.mayor)
        )

        const fallenTownsLen = fallenTowns.length   
        if (fallenTownsLen > 0) {                    
            // If London has fallen, it is most likely an error.
            if (fallenTowns.find(town => town.name == "London")) 
                townFlowChannel.send("<@331822092477792256> Dynmap most likely failed.")
            
            for (let i = 0; i < fallenTownsLen; i++) {
                const town = fallenTowns[i],
                      residentBatch1 = [], 
                      residentBatch2 = [],
                      mayor = town.mayor.replace(/_/g, "\\_")

                const fallenTownEmbed = new Discord.MessageEmbed()
                    .setTitle("A town has fallen!")
                    .setFooter(fn.devsFooter(client))
                    .setThumbnail(client.user.avatarURL())
                    .setTimestamp()
                    .setColor("GREEN")
                    .addFields(
                        fn.embedField("Town Name", town.name + (town.capital ? " :star:" : ""), true),
                        fn.embedField("Nation", town.nation, true)
                    )

                const townResidentsLen = town.residents.length
                for (let j = 0; j < townResidentsLen; j++) {
                    const currentResident = town.residents[j]
                    const curResIndex = town.residents.indexOf(currentResident)

                    const batch = (curResIndex <= 50 ? residentBatch1 : residentBatch2)
                    batch.push(" " + currentResident)
                }
    
                fallenTownEmbed.addFields(fn.embedField("Mayor", 
                    `${ townResidentsLen >= 28 ? "Lord " 
                    : townResidentsLen >= 24 ? "Duke "
                    : townResidentsLen >= 20 ? "Earl "
                    : townResidentsLen >= 14 ? "Count "
                    : townResidentsLen >= 10 ? "Viscount "
                    : townResidentsLen >= 6 ? "Baron "
                    : townResidentsLen >= 2 ? "Chief "
                    : townResidentsLen == 1 ? "Hermit " : "" }`
                    +  mayor, true
                ))
    
                fallenTownEmbed.addFields(
                    fn.embedField("Town Size", town.area.toString(), true),
                    fn.embedField("Location", `[${town.x}, ${town.z}](https://earthmc.net/map/nova/?worldname=earth&mapname=flat&zoom=6&x=${town.x}&y=64&z=${town.z})`, true)
                )

                const residentBatch1String = residentBatch1.toString().replace(/^\s+|\s+$/gm, "")
                if (residentBatch1.length >= 1) {
                     // If second batch is empty, only send first batch
                    if (residentBatch2.length <= 0) {
                        fallenTownEmbed.addFields(
                            fn.embedField(`Residents [${townResidentsLen}]`,
                             "```" + residentBatch1String + "```"
                        ))
                    }
                    else if (residentBatch2.length >= 1) { // Second batch not empty, send both.
                        const residentBatch2String = residentBatch2.toString().replace(/^\s+|\s+$/gm, "")

                        fallenTownEmbed.addFields(
                            fn.embedField("Residents", townResidentsLen),
                            fn.embedField("Resident List [1-50]", "```" + residentBatch1String + "```"),
                            fn.embedField("Resident List [51-" + townResidentsLen + "]", "```" + residentBatch2String + "```")
                        )
                    }
                }
                else fallenTownEmbed.addFields(fn.embedField("Residents", "There are no residents in this town?"))

                townFlowChannel.send({ embeds: [fallenTownEmbed] })
            }
        }
        else console.log(fn.time() + " | No towns have fallen.")
    }
}
//#endregion

// Updates: Player info or remove if purged
/**
 * @param { any[] } players 
 * @param { AURORA | NOVA } map 
 * @returns
 */
async function updatePlayerData(players, map) {
    const mapName = map == AURORA ? 'aurora' : 'nova'

    const onlinePlayers = await map.emc.Players.online().catch(() => {})
    if (!onlinePlayers) return console.log(`Error updating player data on ${mapName}`)

    const now = Timestamp.now()

    //#region Handle online players
    const len = onlinePlayers.length
    for (let i = 0; i < len; i++) {
        const op = onlinePlayers[i]

        const playerInDB = players.find(p => p.name == op.name),
              playerIndex = players.findIndex(p => p.name == op.name)
            
        const player = {
            name: op.name,
            lastOnline: {
                nova: playerInDB?.lastOnline?.nova ?? null,
                aurora: playerInDB?.lastOnline?.aurora ?? null
            }
        }
        
        const linkedId = playerInDB?.linkedID
        if (linkedId) player.linkedID = linkedId

        player.lastOnline[mapName] = now

        // Not in db, add them.
        if (!playerInDB) players.push(player)
        else players[playerIndex] = player // Update them.
    }
    //#endregion

    await database.setPlayers(players)
}

// Updates: Towns, Nations, Residents
/**
 * @param { AURORA | NOVA } map 
 * @returns 
 */
async function updateMapData(map) {
    const towns = await map.emc.Towns.all().catch(console.error)
    if (!towns) return console.log("Could not update map data! 'towns' is null or undefined.")

    const nations = await map.emc.Nations.all(towns).catch(console.error)
    if (!nations) return console.log("Could not update map data! 'nations' is null or undefined.")

    console.log('Updating ' + (map == NOVA ? "nova" : "aurora") + ' data..')

    //#region Town Logic 
    const townsArray = towns.map(t => {
        const isNPC = /^NPC[0-9]{1,5}$/.test(t.mayor)
        t["ruined"] = !isNPC && t.residents ? false : true

        return t
    })

    if (townsArray?.length > 0)
        await map.db.setTowns(townsArray)
    //#endregion

    //#region Resident Logic
    const tLen = townsArray.length,
          residentsArray = []

    for (let i = 0; i < tLen; i++) {
        const currentTown = townsArray[i]
        if (currentTown.ruined) continue

        const rLen = currentTown.residents.length
        for (let j = 0; j < rLen; j++) {
            const currentResident = currentTown.residents[j]
            let rank = currentTown.mayor == currentResident ? "Mayor" : "Resident"

            if (rank == "Mayor" && currentTown.capital) 
                rank = "Nation Leader" 
                
            residentsArray.push({
                name: currentResident,
                townName: currentTown.name,
                townNation: currentTown.nation,
                rank: rank
            })
        }
    }

    if (residentsArray?.length > 0)
        await map.db.setResidents(residentsArray)
    //#endregion

    //#region Nation Logic
    const dbNations = await map.db.getNations().catch(console.error)
    if (!dbNations) return console.log('Failed to fetch db nations.')

    const nationsArray = nations.map(nation => {
        const foundNation = dbNations.find(n => latinize(n.name) == latinize(nation.name))
        if (!foundNation) console.log(`'${nation.name}' does not exist in the DB, creating it..`)

        nation["kingPrefix"] = foundNation?.kingPrefix ?? "",
        nation["flag"] = foundNation?.flag ?? "",
        nation["discord"] = foundNation?.discord ?? ""

        return nation
    })

    // Make sure we don't overwrite with empty/null
    if (nationsArray?.length > 0)
        map.db.setNations(nationsArray)
    //#endregion
}
//#endregion

//#region Live Stuff
const filterLiveEmbeds = (arr, map) => arr.filter(msg => msg.embeds.length >= 1 
    && msg.embeds[0]?.title?.includes(`Townless Players (${map})`) && msg.author.id == "656231016385478657")

/**
 * @param { Discord.Message } msg
 * @param { any[] } arr
 * @param { string } mapName
 */
const editEmbed = (msg, arr, mapName) => {
    const names = arr.map(player => player.name).join('\n')
    const newEmbed = new Discord.MessageEmbed()
        .setTitle(`Live Townless Players (${mapName})`)
        .setColor("DARK_PURPLE")
        .setFooter(fn.devsFooter(client))
        .setTimestamp()

    let desc = ""
    if (arr.length < 1) desc = "There are currently no townless players!"
    else if (arr.toString().length >= 2048) desc = "```" + (names.match(/(?:^.*$\n?){1,30}/mg))[0] + "```"
    else desc = "```" + arr[0].name + "\n" + names + "```"

    newEmbed.setDescription(desc)
    msg.edit({ embeds: [newEmbed] }).catch(err => console.log(err))
}

async function liveTownless() {
    const townlessSubbedChannelIDs = fn.townlessSubbedChannelArray,
          len = townlessSubbedChannelIDs.length

    const auroraTownlessPlayers = await emc.Aurora.Players.townless().catch(() => console.error("Error fetching Aurora townless."))
    const novaTownlessPlayers = await emc.Nova.Players.townless().catch(() => console.error("Error fetching Nova townless."))

    // For every townless subbed channel
    for (let i = 0; i < len; i++) {
        const cur = townlessSubbedChannelIDs[i]
        if (!cur || cur == '') continue
 
        const curChannel = await client.channels.fetch(cur).catch(() => {})
        if (!curChannel) {
            if (!prod) continue

            console.log(`${fn.time()} | Deleting unavailable channel '${cur}' in townless subs array!`)

            townlessSubbedChannels.update({ channelIDs: FieldValue.arrayRemove(cur) })
            townlessSubbedChannelIDs.splice(i, 1)

            fn.townlessSubbedChannelArray = townlessSubbedChannelIDs
        } else {
            if (!fn.canViewAndSend(curChannel)) continue
            
            // Fetch the channel's messages.
            curChannel.messages.fetch().then(async msgs => {
                const auroraEmbeds = filterLiveEmbeds(msgs, 'Aurora'),
                      novaEmbeds = filterLiveEmbeds(msgs, 'Nova')

                if (auroraTownlessPlayers) auroraEmbeds.forEach(msg => editEmbed(msg, auroraTownlessPlayers, 'Aurora'))
                if (novaTownlessPlayers) novaEmbeds.forEach(msg => editEmbed(msg, novaTownlessPlayers, 'Nova'))
            }).catch(console.error)
        }
    }
}

async function liveQueue() {              
    const server = await emc.MojangLib.servers.get("play.earthmc.net").catch(() => {}),
          aurora = server ? await database.Aurora.getOnlinePlayerData() : null,
          nova   = server ? await database.Nova.getOnlinePlayerData() : null

    const queue = new Queue(server, aurora, nova)
    await queue.init()

    const embed = new Discord.MessageEmbed()
        .setTitle("Queue & Player Info | Live")
        .setThumbnail(client.user.avatarURL())
        .setColor("GREEN")

    const totalMax = (queue.nova.config?.maxcount ?? 100) + (queue.aurora.config?.maxcount ?? 250)
    embed.addFields(
        fn.embedField("Total Queue Count", queue.get(), true),
        fn.embedField("Total Server Count", `${queue.totalPlayers}/${totalMax}`, true),
        fn.embedField("Aurora", queue.aurora.formatted),
        fn.embedField("Nova", queue.nova.formatted)
    )
        
    const queueSubbedChannelIDs = fn.queueSubbedChannelArray,
          len = queueSubbedChannelIDs.length

    for (let i = 0; i < len; i++) {
        const cur = queueSubbedChannelIDs[i]

        if (!cur || cur == '') continue
        const currentQueueSubbedChannel = client.channels.cache.get(cur)

        if (!currentQueueSubbedChannel) {
            if (!prod) continue

            // Delete unavailable channel
            await queueSubbedChannels.update({ channelIDs: FieldValue.arrayRemove(cur) })
            queueSubbedChannelIDs.splice(i, 1)

            fn.queueSubbedChannelArray = queueSubbedChannelIDs
        } else {
            if (!fn.canViewAndSend(currentQueueSubbedChannel)) continue

            currentQueueSubbedChannel.messages.fetch().then(async msgs => {
                const queueEmbedArray = msgs.filter(msg =>
                    msg.embeds.length >= 1 && 
                    msg.embeds[0].title.includes('Queue') && 
                    msg.author.id == "656231016385478657"
                )

                queueEmbedArray.forEach(qMsg => qMsg.edit({embeds: [embed]}).catch(() => {}))
            }).catch(() => {})
        }
    }
}
//#endregion

//#region Registry
async function registerCommands() {
    const data = [],
          slashCommands = fs.readdirSync('./aurora/slashcommands').filter(file => file.endsWith('.js')),
          auroraCmds = fs.readdirSync('./aurora/commands').filter(file => file.endsWith('.js')),
          novaCmds = fs.readdirSync('./nova/commands').filter(file => file.endsWith('.js'))

    for (const file of auroraCmds) {
        const command = require(`./aurora/commands/${file}`)

        if (!command.disabled) 
            client.auroraCommands.set(command.name, command)
    }

    for (const file of novaCmds) {
        const command = require(`./nova/commands/${file}`)

        if (!command.disabled) 
            client.novaCommands.set(command.name, command)
    }

    for (const file of slashCommands) {
         const command = require(`./aurora/slashcommands/${file}`)
         if (command.disabled) continue
        
         client.slashCommands.set(command.name, command)

         if (command.data) data.push(command.data.toJSON())
         else {
             data.push({
                 name: command.name,
                 description: command.description
            })
        }
    }

    const { ContextMenuCommandBuilder } = require('@discordjs/builders'),
            linkAction = new ContextMenuCommandBuilder().setName("Link User").setType(2)
            
    data.push(linkAction)

    if (prod) await client.application.commands.set(data)
    else await client.guilds.cache.get(process.env.DEBUG_GUILD)?.commands.set(data)
}
//#endregion

//#region Error Handling
client.on('error', err => {
    if (err.code != 50013) console.log(err)
})

process.on('unhandledRejection', err => console.error('Unhandled promise rejection: ', err))

process.on('uncaughtException', err => {
    if (err.code != 50013) 
        console.error('Uncaught Exception!\n', err)
})
//#endregion