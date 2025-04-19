import { request } from "undici"
import type { Client, Collection, Message, TextChannel } from "discord.js"

import { database, AURORA } from "./index.js"

import News from "../objects/News.js"
import type { ReqMethod } from "../types.js"

import dotenv from 'dotenv'
dotenv.config()

const REQ_HEADERS = {
    'Content-Type': 'application/json',
    'authorization': process.env.API_AUTH_KEY
}

async function sendRequest(route: string, method: ReqMethod, content: any) {
    return request(`https://emctoolkit.vercel.app/api/${route}`, {
        method: method,
        body: JSON.stringify(content),
        headers: REQ_HEADERS
    }).catch(console.warn)
}

const isValidMessage = (msg: Message) => 
    msg.content != "[Original Message Deleted]" &&
    !msg.content.startsWith("/")

export const sendNews = async (client: Client, map: 'aurora') => {
    const channel = await client.channels.fetch(AURORA.newsChannel) as TextChannel
    const msgs = await channel.messages.fetch({ limit: 100 })

    return sendNewsReq(msgs.filter(m => isValidMessage(m)), map)
}

async function sendNewsReq(msgs: Collection<string, Message>, mapName: 'aurora') {
    const all = msgs.sort((a, b) => b.createdTimestamp - a.createdTimestamp).map(m => new News(m))

    await sendRequest(`${mapName}/news`, 'POST', all)
    console.log(`[${mapName.toUpperCase()} - Custom API] Sent POST request to news.`)
}

export async function sendAuroraAlliances() {
    const auroraAlliances = await database.AuroraDB.getAlliances()
    if (auroraAlliances) {
        await sendRequest('aurora/alliances', 'PUT', auroraAlliances)
        console.log('[AURORA - Custom API] Sent PUT request to alliances.')
    }
}