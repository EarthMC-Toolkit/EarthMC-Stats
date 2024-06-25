import * as emc from "earthmc"

import type { Client } from "discord.js"
import type { Firestore } from "firebase-admin/firestore"
import type { MapInstance } from "./types.js"

import { 
    type DocReference, 
    Aurora, Nova 
} from "../bot/utils/database.js"

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
    emc: emc.Nova, 
    db: Nova 
}

const AURORA: MapInstance = { 
    emc: emc.Aurora, 
    db: Aurora 
}

export {
    prod, setProduction,
    client, setClient, 
    db, setDatabase,
    townlessSubbedChannels,
    queueSubbedChannels,
    NOVA, AURORA
}