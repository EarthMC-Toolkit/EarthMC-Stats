import { BaseHelper } from "./base.js"

import { 
    type Client,
    Colors
} from "discord.js"

import { 
    type RawNationV3,
    OfficialAPI
} from "earthmc"

class NationHelper extends BaseHelper {
    #apiNation: RawNationV3 = null
    get apiNation() { return this.#apiNation }

    constructor(client: Client) {
        super(client)
        this.embed.setColor(Colors.Orange)
    }

    async init(input: string) {
        const arg1 = input?.toLowerCase()
        
        this.#apiNation = await OfficialAPI.V3.nations(arg1).then(arr => arr[0])
        
        
        return false
    }

    #setupEmbed() {
        
    }

    createEmbed() {
        this.#setupEmbed()
        return this.embed
    }
}

export {
    NationHelper
}