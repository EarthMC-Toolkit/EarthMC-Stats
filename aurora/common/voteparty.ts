import { OfficialAPI } from "earthmc"
import { BaseHelper } from "./base.js"

import type { Client } from "discord.js"

export class VPHelper extends BaseHelper {
    #target: number
    get target() {
        return this.#target
    }
    
    #current: number
    get current() {
        return this.#current
    }

    constructor(client: Client, isNova = false) {
        super(client, isNova)

        // Pastel pink
        this.embed.setColor("#fcb8f7")
    }

    async init() {
        try {
            const info = await OfficialAPI.V3.serverInfo()
        
            this.#target = info.voteParty.target
            this.#current = info.voteParty.numRemaining // Why tf is it named 'remaining' ??

            return true
        } catch(_) {
            return false
        }
    }

    createEmbed() {
        this.embed.setTitle("Current VoteParty Status")
        this.embed.setThumbnail('attachment://aurora.png')

        this.addField("Target", `\`${this.target.toString()}\``, true)
        this.addField("Current", `\`${this.#current.toString()}\``, true)
        this.addField("Remaining", `\`${(this.target - this.current).toString()}\``)

        return this.embed
    }
}