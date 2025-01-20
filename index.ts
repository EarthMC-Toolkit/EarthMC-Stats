//#region Imports
import dotenv from 'dotenv'
dotenv.config()

import { 
    Client, 
    IntentsBitField,
    Collection
} from "discord.js"

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import { 
    setClient, 
    prod, setProduction, 
    setDatabase 
} from "./bot/constants.js"

import type { DJSEvent, ErrorWithCode, ExtendedClient } from "./bot/types.js"
import { readTsFiles } from "./bot/utils/fn.js"
//#endregion

//#region Check production
setProduction(process.env.PROD == "true")
console.log(prod ? "Running in production." : "Running in maintenance, live functions disabled.")
//#endregion

//#region Initialize Discord
const Intents = IntentsBitField.Flags
const client: ExtendedClient = new Client({ 
    allowedMentions: { repliedUser: false },
    intents: [
        Intents.Guilds, 
        Intents.GuildMessages, 
        Intents.GuildMembers,
        Intents.DirectMessages, 
        Intents.DirectMessageReactions,
        Intents.MessageContent
    ]
})

client.login(process.env.DISCORD_BOT_TOKEN).then(token => {
    client.slashCommands = new Collection()
    client.auroraCommands = new Collection()

    console.log(`Logged into Discord.\nToken: ${token}`)
}).catch(console.error)

setClient(client)
//#endregion

//#region Firebase Setup
const { 
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY
} = process.env

initializeApp({
    credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: JSON.parse(JSON.stringify(FIREBASE_PRIVATE_KEY))
    })
})

const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

setDatabase(db)
//#endregion

//#region Event Handler
const eventFiles = readTsFiles(`bot/events`)

for (const file of eventFiles) {
    const eventFile = await import(`./bot/events/${file}`)
    const event = eventFile.default as DJSEvent

    if (event.once) client.once(event.name, (...args) => event.execute(...args)) 
    else client.on(event.name, (...args) => event.execute(...args))
}
//#endregion

//#region Error Handling
client.on('error', (err: ErrorWithCode) => {
    const missingAccess = 50001
    const missingPerms = 50013

    if (missingPerms || missingAccess) return
    console.error(err)
})

process.on('unhandledRejection', (err: ErrorWithCode) => console.error('Unhandled promise rejection: ', err))
process.on('uncaughtException', (err: ErrorWithCode) => {
    if (err.code != 50013) console.error('Uncaught Exception!\n', err)
})
//#endregion

//#region ANTI-PING SPAM
const replies = [
    "no.", "be fucking patient moron", "I DO NOT CARE", "Do it again, I dare you.", 
    "^ this guy likes boys", "you have severe brain damage.", "shutup and smd", 
    "You have been automatically reported to Discord.", "Please hold. Currently doing your mother.",
    "imagine being this impatient", "suck a dick.", "☝ everyone laugh at this dipshit",
    "want something? wait nicely like a good dog", "emc is not that important brother"
]

const myID = "263377802647175170"
const editorID = "263377802647175170"

client.on('messageCreate', async msg => {
    const { guild, member, mentions } = msg

    if (msg.author.bot) return

    if (guild.id != "966271635894190090") return // Ensure toolkit discord
    if (member.roles.cache.has(editorID)) return // Ensure not editor
    
    // Hasn't mentioned me (@ or reply with @ on)
    if (!mentions.has(myID)) return

    // Allow mention if its a reply to me.
    if (mentions.repliedUser?.id == myID) return

    await msg.reply(replies[Math.floor(Math.random() * replies.length)])
    member.timeout(10 * 60 * 1000)
})
//#endregion