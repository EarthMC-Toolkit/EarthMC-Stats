import { request } from "undici"

import { Aurora, Nova } from "./database.js"
import { 
    AURORA, NOVA, 
    unixFromDate, 
    jsonReq 
}  from "./fn.js"

import News from "../objects/News.js"

import type { Client, Collection, Message, TextChannel } from "discord.js"
import type { ReqMethod } from "../types.js"

const reqHeaders = {
    'Content-Type': 'application/json',
    'authorization': process.env.API_AUTH_KEY
}

const sendRequest = async (route: string, method: ReqMethod, content) => request(`https://emctoolkit.vercel.app/api/${route}`, {
    method: method,
    body: JSON.stringify(content),
    headers: reqHeaders
}).catch(console.warn)

const replaceWithUnix = (arr, map) => arr.filter(p => !!p.lastOnline && p.lastOnline[map])
    .map(p => ({ ...p, lastOnline: unixFromDate(p.lastOnline[map]) }))

const sendNews = async (client: Client, map: 'aurora' | 'nova') => {
    const channel = await client.channels.fetch(map == 'nova' ? NOVA.newsChannel : AURORA.newsChannel) as TextChannel
    const msgArr = await channel.messages.fetch().then(msgs => msgs.filter(m => 
        m.content != "[Original Message Deleted]" && 
        !m.content.startsWith("/")
    )).catch(e => { console.error(e); return null })

    if (!msgArr) return
    return sendNewsReq(msgArr, map)
}

async function sendNewsReq(msgs: Collection<string, Message>, mapName: 'aurora' | 'nova') {
    const route = `${mapName}/news`
    await sendRequest(route, 'POST', { 
        all: msgs.map(m => new News(m)), 
        latest: new News(msgs.first())
    })
    
    console.log(`Sent POST request to ${route}`)
}

export async function sendNovaAlliances() {
    const novaAlliances = await Nova.getAlliances()
    if (novaAlliances) await sendRequest('nova/alliances', 'PUT', novaAlliances)

    console.log('[Nova] Sent PUT requests to alliances')
}

export async function sendAuroraAlliances() {
    const auroraAlliances = await Aurora.getAlliances()
    if (auroraAlliances) await sendRequest('aurora/alliances', 'PUT', auroraAlliances)

    console.log('[Aurora] Sent PUT requests to alliances')
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

const get = endpoint => jsonReq(`https://emctoolkit.vercel.app/api/${endpoint}`)
export {
    replaceWithUnix,
    sendNews,
    get
}