import { 
    type Client,
    AttachmentBuilder,
    Colors
} from "discord.js"

import { 
    type RawNationV3,
    Aurora,
    OfficialAPI
} from "earthmc"

import BaseCommandHelper from "./base.js"
import { auroraNationBonus, backtick, secToMs } from "../../bot/utils/fn.js"
import * as DiscordUtils from "../../bot/utils/discord.js"

class NationHelper extends BaseCommandHelper {
    #apiNation: RawNationV3 = null
    get apiNation() { return this.#apiNation }

    constructor(client: Client) {
        super(client)
        this.embed.setColor(Colors.Orange)
    }

    async init(input: string) {
        const arg1 = input?.toLowerCase()
        
        this.#apiNation = await OfficialAPI.V3.nations(arg1).then(arr => arr[0])
        
        
        return !!this.#apiNation
    }

    getDownloadAttachment() {
        const buf = Buffer.from(this.raw())
        return new AttachmentBuilder(buf, { 
            name: `${this.#apiNation.name}_NationEmbed.json` 
        })
    }

    #setupEmbed() {
        const resLength = this.apiNation.residents.length
        
        const label = this.getLabel(resLength)
        //const rank = this.getRank(resLength)

        const kingPrefix = /* dbNation.kingPrefix | */ this.getLeaderPrefix(resLength)
        const bonus = auroraNationBonus(resLength)

        const spawnLoc = this.getSpawnLocation()
        const mapUrl = Aurora.buildMapLink(spawnLoc, 5)

        const area = Math.round(this.apiNation.stats.numTownBlocks)

        this.embed.setTitle(`Nation Info | ${backtick(label)}`)

        const foundedTimestamp = DiscordUtils.timestampDateTime(this.apiNation.timestamps.registered)
        this.embed.setDescription(`${this.apiNation.board}\n\nFounded on ${foundedTimestamp}.`)

        this.addField("Leader", backtick(this.apiNation.king.name, { prefix: kingPrefix }), true)
            .addField("Capital", backtick(this.apiNation.capital.name), true)
            .addField("Location", `[${spawnLoc.x}, ${spawnLoc.z}](${mapUrl.toString()})`, true)
            .addField("Residents", backtick(resLength.toString()), true)
            .addField("Size", `${DiscordUtils.EMOJI_CHUNK} ${backtick(area)} Chunks`, true)
            .addField("Bonus", `${DiscordUtils.EMOJI_CHUNK} ${backtick(bonus)} Chunks`, true)
            .addField("Balance", `${DiscordUtils.EMOJI_GOLD} ${backtick(this.apiNation.stats.balance)}`, true)
    }

    getSpawnLocation() {
        return this.apiNation.coordinates.spawn
    }

    getLeaderPrefix(residentsAmt: number) {
        return residentsAmt >= 60 ? "God Emperor "
            : residentsAmt >= 40 ? "Emperor "
            : residentsAmt >= 30 ? "King "
            : residentsAmt >= 20 ? "Duke "
            : residentsAmt >= 10 ? "Count "
            : residentsAmt >= 0 ? "Leader " : ""
    }

    getLabel(residentsAmt: number) {
        const nationName = this.apiNation.name
        return residentsAmt >= 60 ? `The ${nationName} Realm`
            : residentsAmt >= 40 ? `The ${nationName} Empire`
            : residentsAmt >= 30 ? `Kingdom of ${nationName}`
            : residentsAmt >= 20 ? `Dominion of ${nationName}`
            : residentsAmt >= 10 ? `Federation of ${nationName}`
            : `Land of ${nationName}`
    }

    fetchRecentNews() {

    }

    /**
     * Adds custom info (if set) from the database to the embed. The nation leader can set this information via the `/nationset` command.\
     * To see all current info that a leader can set, take a look at the choices of the 'type' option on the SlashCommandBuilder in `nationset.ts`.
     */
    addDbInfo() {
        
    }

    createEmbed() {
        this.#setupEmbed()
        return this.embed
    }
}

export {
    NationHelper
}