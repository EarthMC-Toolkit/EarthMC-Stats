//#region Imports
import dotenv from 'dotenv'
dotenv.config()

import { 
    Client, 
    IntentsBitField,
    Collection,
    Partials
} from "discord.js"

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import { 
    setClient,
    setProduction, 
    setDatabase
} from "./bot/constants.js"

import type { DJSEvent, ErrorWithCode, ExtendedClient } from "./bot/types.js"
import { readTsFiles } from "./bot/utils/index.js"
//#endregion

//#region Check production
const prod = process.env.NODE_ENV == "production"
setProduction(prod)

// NOTE: PM2 ecosystem file overrides NODE_ENV depending on how we started via --env.
//       Any local .env files should always have NODE_ENV set to "development" for starting without PM2.
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
    ],
    partials: [
        Partials.Message,
        Partials.User,
        Partials.Reaction,
        Partials.Channel
    ]
})

client.login(process.env.DISCORD_BOT_TOKEN).then(token => {
    client.slashCommands = new Collection()
    client.commands = new Collection()
    client.buttons = new Collection()

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
db.settings({
    ignoreUndefinedProperties: true,
    preferRest: true
})

setDatabase(db)
//#endregion

//#region Event Handler
const EVENTS_PATH = `bot/events`
const EVENT_FILES = readTsFiles(EVENTS_PATH)

for (const file of EVENT_FILES) {
    const eventFile = await import(`./${EVENTS_PATH}/${file}`)
    const event: DJSEvent = eventFile.default

    if (event.once) client.once(event.name, (...args) => event.execute(...args)) 
    else client.on(event.name, (...args) => event.execute(...args))
}
//#endregion

//#region Error Handling
const IGNORE_ERR_CODES = [50013, 50001]

client.on('error', (err: ErrorWithCode) => {
    if (IGNORE_ERR_CODES.includes(err.code)) return
    console.error(err)
})

client.on('warn', console.warn)

process.on('unhandledRejection', (err: ErrorWithCode) => console.error('Unhandled promise rejection: ', err))
process.on('uncaughtException', (err: ErrorWithCode) => {
    if (IGNORE_ERR_CODES.includes(err.code)) return
    console.error('Uncaught Exception!\n', err)
})
//#endregion

//#region ANTI-PING SPAM
// const replies = [
//     "no.", "be fucking patient moron", "I DO NOT CARE", "Do it again, I dare you.", "you have severe brain damage.", 
//     "shutup and smd", "You have been automatically reported to Discord.", "Please hold. Currently doing your mother.",
//     "imagine being this impatient", "suck a dick.", "want something? wait nicely like a good dog", 
//     "emc is not that important brother", "☝ everyone laugh at this dipshit"
// ]

// const myID = "263377802647175170"
// const editorID = "966359842417705020"

// client.on('messageCreate', async msg => {
//     if (msg.author.bot) return
    
//     const { guild, member, mentions } = msg

//     if (guild.id != "966271635894190090") return // Ensure toolkit discord
//     if (member.roles.cache.has(editorID)) return // Ensure not editor
    
//     // Hasn't mentioned me (@ or reply with @ on)
//     if (!mentions.has(myID)) return

//     // Allow mention if its a reply to me.
//     if (mentions.repliedUser?.id == myID) return

//     await msg.reply(replies[Math.floor(Math.random() * replies.length)])
//     member.timeout(10 * 60 * 1000)
// })
//#endregion