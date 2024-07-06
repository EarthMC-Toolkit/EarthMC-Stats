import { Aurora, Nova } from "earthmc"

import type { Client } from "discord.js"
import type { Firestore } from "firebase-admin/firestore"
import type { MapInstance } from "./types.js"

import { 
    type DocReference, 
    Aurora as AuroraDB, 
    Nova as NovaDB
} from "../bot/utils/database.js"

import TTLCache from '@isaacs/ttlcache'

let prod: boolean = false
const setProduction = (val: boolean) => prod = val

let client: Client = null
const setClient = (val: Client) => client = val

let db: Firestore = null
let queueSubbedChannels: DocReference = null
let townlessSubbedChannels: DocReference = null

const setDatabase = (val: Firestore) => {
    db = val

    const subsCollection = db.collection("subs")
    queueSubbedChannels = subsCollection.doc("queue")
    townlessSubbedChannels = subsCollection.doc("townless")
}

const NOVA: MapInstance = { 
    emc: Nova, 
    db: NovaDB 
}

const AURORA: MapInstance = { 
    emc: Aurora, 
    db: AuroraDB 
}

// We update this every x seconds, so expiry isn't needed.
const cache = new TTLCache<string, any>({ ttl: Infinity }) 

export {
    prod, setProduction,
    client, setClient, 
    cache, db, setDatabase,
    townlessSubbedChannels,
    queueSubbedChannels,
    NOVA, AURORA
}