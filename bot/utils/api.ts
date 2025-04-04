import { request } from "undici"

import { Aurora } from "./database.js"
import { 
    AURORA,
    unixFromDate
}  from "./fn.js"

import News from "../objects/News.js"

import type { Client, Collection, Message, TextChannel } from "discord.js"
import type { DBPlayer, ReqMethod } from "../types.js"

const reqHeaders = {
    'Content-Type': 'application/json',
    'authorization': process.env.API_AUTH_KEY
}

const sendRequest = async (route: string, method: ReqMethod, content: any) => request(`https://emctoolkit.vercel.app/api/${route}`, {
    method: method,
    body: JSON.stringify(content),
    headers: reqHeaders
}).catch(console.warn)

const replaceWithUnix = (arr: DBPlayer[], map: 'aurora') => arr.filter(p => !!p.lastOnline && p.lastOnline[map])
    .map(p => ({ ...p, lastOnline: unixFromDate(p.lastOnline[map]) }))

const isValidMessage = (msg: Message) => 
    msg.content != "[Original Message Deleted]" &&
    !msg.content.startsWith("/")

const sendNews = async (client: Client, map: 'aurora') => {
    const channel = await client.channels.fetch(AURORA.newsChannel) as TextChannel
    const msgs = await channel.messages.fetch({ limit: 100 })

    return sendNewsReq(msgs.filter(m => isValidMessage(m)), map)
}

async function sendNewsReq(msgs: Collection<string, Message>, mapName: 'aurora') {
    const route = `${mapName}/news`
    const all = msgs.sort((a, b) => b.createdTimestamp - a.createdTimestamp).map(m => new News(m))

    await sendRequest(route, 'POST', all)
    console.log(`Sent POST request to ${route}`)
}

export async function sendAuroraAlliances() {
    const auroraAlliances = await Aurora.getAlliances()
    if (auroraAlliances) {
        await sendRequest('aurora/alliances', 'PUT', auroraAlliances)
        console.log('[Aurora] Sent PUT request to alliances')
    }
}

// const getDBPlayers = async () => database.getPlayers().then(players => {
//     if (!players) return null

//     return players.map(p => {
//         let id = p.linkedID

//         if (id && id != '')
//             p.discord = id

//         delete p.linkedID
//         return p
//     })
// })//.catch(console.log)

export {
    replaceWithUnix,
    sendNews
}