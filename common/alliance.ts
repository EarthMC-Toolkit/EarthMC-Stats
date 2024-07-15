import { BaseHelper } from "./base.js"

import type { Client } from "discord.js"
import { Colors } from "discord.js"

class AllianceHelper extends BaseHelper {
    constructor(client: Client, isNova = false) {
        super(client, isNova)
        this.embed.setColor(Colors.DarkBlue)
    }

    async init(_input: string) {
        return false
    }

    setupEmbed() {
        
    }
}

export {
    AllianceHelper
}