import { BaseCommandHelper } from "./base.js"

import type { Client } from "discord.js"
import { Colors } from "discord.js"

class AllianceHelper extends BaseCommandHelper {
    constructor(client: Client) {
        super(client)
        this.embed.setColor(Colors.DarkBlue)
    }

    async init(_input: string) {
        return false
    }

    createEmbed() {
        //this.#setupEmbed()
        return this.embed
    }
}

export {
    AllianceHelper
}