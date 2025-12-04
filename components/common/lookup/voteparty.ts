import { OfficialAPI } from "earthmc"
import type { AttachmentBuilder, Client } from "discord.js"

import CommandLookup from "./base.js"
import { backtick } from "../../../bot/utils/fn.js"

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
        
            console.log(info)

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

        this.addField("Target", `${backtick(this.target.toString())}`, true)
        this.addField("Current", `${backtick(this.current.toString())}`, true)
        this.addField("Remaining", `${backtick(this.remaining.toString())}`)

        return this.embed
    }

    getDownloadAttachment(): AttachmentBuilder {
        throw new Error("Method not implemented.")
    }
}