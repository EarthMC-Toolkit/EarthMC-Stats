import { Client } from "discord.js"
import * as emc from "earthmc"
import * as database from "../bot/utils/database.js"

let prod: boolean
const setProduction = (val: boolean) => prod = val

let client: Client = null
const setClient = (val: Client) => client = val

const NOVA = { 
    emc: emc.Nova, 
    db: database.Nova 
}

const AURORA = { 
    emc: emc.Aurora, 
    db: database.Aurora 
}

export {
    prod, setProduction,
    client, setClient, 
    NOVA, AURORA
}