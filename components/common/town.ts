import {
    Colors,
    type Client
} from "discord.js"

import { 
    OfficialAPI, 
    type RawTownV3
} from "earthmc"

import { BaseCommandHelper } from "./base.js"

class TownHelper extends BaseCommandHelper {
    #apiTown: RawTownV3 = null
    get apiNation() { return this.#apiTown }

    constructor(client: Client) {
        super(client)
        this.embed.setColor(Colors.Green)
    }

    async init(input: string) {
        const arg1 = input?.toLowerCase()
        
        try {
            this.#apiTown = await OfficialAPI.V3.towns(arg1).then(arr => arr[0])
        } catch(e: any) {
            console.error(e)
            return false
        }
    }

    createEmbed() {
        //this.#setupEmbed()
        return this.embed
    }
}

export {
    TownHelper
}