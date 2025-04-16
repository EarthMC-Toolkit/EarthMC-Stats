import { OfficialAPI } from "earthmc"
import CommandLookup from "./base.js"

import type { AttachmentBuilder, Client } from "discord.js"

export class VPLookup extends CommandLookup {
    #target: number
    get target() {
        return this.#target
    }
    
    #remaining: number
    get remaining() {
        return this.#remaining
    }

    get current() {
        return this.target - this.#remaining
    }

    constructor(client: Client) {
        super(client)
        this.embed.setColor("#fcb8f7") // Pastel pink
    }

    async init() {
        try {
            const info = await OfficialAPI.V3.serverInfo()
        
            this.#target = info.voteParty.target
            this.#remaining = info.voteParty.numRemaining

            return true
        } catch (err) {
            console.error("Failed to initialize VPHelper:", err)
            return false
        }
    }

    createEmbed() {
        this.embed.setTitle("Current VoteParty Status")
        this.embed.setThumbnail('attachment://aurora.png')

        this.addField("Target", `\`${this.target.toString()}\``, true)
        this.addField("Current", `\`${this.current.toString()}\``, true)
        this.addField("Remaining", `\`${this.remaining.toString()}\``)

        return this.embed
    }

    getDownloadAttachment (): AttachmentBuilder {
        throw new Error("Method not implemented.")
    }
}