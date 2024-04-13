//#region Imports
import dotenv from 'dotenv'
dotenv.config()

import { 
    Client, 
    IntentsBitField,
    Collection,
} from "discord.js"

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import { 
    setClient, 
    setProduction, 
    setDatabase 
} from "./bot/constants.js"

import { DJSEvent } from "./bot/types.js"
import { readTsFiles } from "./bot/utils/fn.js"
//#endregion

//#region Check production
const prod = process.env.PROD == "true"
setProduction(prod)

console.log(prod ? "Running in production." : "Running in maintenance, live functions disabled.")
//#endregion

//#region Initialize Discord
const Intents = IntentsBitField.Flags
const client = new Client({ 
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
    client['slashCommands'] = new Collection()
    client['auroraCommands'] = new Collection()
    client['novaCommands'] = new Collection()

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
client.on('error', (err: Error & { code: number }) => {
    if (err.code != 50013) console.log(err)
})

process.on('unhandledRejection', (err: Error & { code: number }) => console.error('Unhandled promise rejection: ', err))

process.on('uncaughtException', (err: Error & { code: number }) => {
    if (err.code != 50013) 
        console.error('Uncaught Exception!\n', err)
})
//#endregion