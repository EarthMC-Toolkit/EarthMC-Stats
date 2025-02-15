import { Aurora } from "earthmc"

import type { Client } from "discord.js"
import type { Firestore } from "firebase-admin/firestore"
import type { MapInstance, SeenPlayer } from "./types.js"

import { 
    type DocReference, 
    Aurora as AuroraDB
} from "../bot/utils/database.js"

import TTLCache from '@isaacs/ttlcache'

let prod = false
const setProduction = (val: boolean) => prod = val

let client: Client = null
const setClient = (val: Client) => client = val

let db: Firestore = null
let queueSubbedChannels: DocReference = null
let townlessSubbedChannels: DocReference = null

const setDatabase = (instance: Firestore) => {
    db = instance

    const subsCollection = db.collection("subs")
    queueSubbedChannels = subsCollection.doc("queue")
    townlessSubbedChannels = subsCollection.doc("townless")
}

const AURORA: MapInstance = { 
    emc: Aurora,
    db: AuroraDB
}

// We update this every x seconds, so expiry isn't needed.
const cache = new TTLCache<string, any>({ ttl: Infinity })

export const lastSeenPlayers = new Map<string, SeenPlayer>()

export {
    prod, setProduction,
    client, setClient, 
    cache, db, setDatabase,
    townlessSubbedChannels,
    queueSubbedChannels,
    AURORA
}