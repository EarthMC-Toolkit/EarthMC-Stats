import type {
    Client,
    Message,
    TextChannel
} from "discord.js"

import { 
    AttachmentBuilder,
    Colors
} from "discord.js"

import { 
    type StrictPoint2D,
    type RawNationV3,
    // NotFoundError,
    // SquaremapTown,
    Aurora,
    OfficialAPI
} from "earthmc"

import { AURORA, auroraNationBonus, backtick } from "../../bot/utils/fn.js"

import * as DiscordUtils from "../../bot/utils/discord.js"
import * as database from "../../bot/utils/database.js"

import News from "../../bot/objects/News.js"
import BaseCommandHelper from "./base.js"

class NationHelper extends BaseCommandHelper {
    #apiNation: RawNationV3 = null
    get apiNation() { return this.#apiNation }

    #recentNews: News = null
    get recentNews() { return this.#recentNews }

    #affiliatedAlliances: string[] = []
    get affiliatedAlliances() { return this.#affiliatedAlliances }

    constructor(client: Client) {
        super(client)
        this.embed.setColor(Colors.Orange)
    }

    async init(input: string) {
        const arg1 = input?.toLowerCase()
        
        try {
            this.#apiNation = await OfficialAPI.V3.nations(arg1).then(arr => arr[0])
        } catch(e: any) {
            console.error(e)
            return false
        }

        this.#recentNews = await this.fetchRecentNews()
        this.#affiliatedAlliances = await this.fetchAffiliatedAlliances()

        return true
    }

    /**
     * Gets the spawn location of nation (from the API) and makes it conform to {@link StrictPoint2D} with the option to strip decimals per coord.
     * @param truncX - Whether to truncate the X coordinate to remove all decimals.
     * @param truncZ - Whether to truncate the Z coordinate to remove all decimals.
     */
    getSpawnPoint(truncX = false, truncZ = false): StrictPoint2D {
        const apiLoc = this.apiNation.coordinates.spawn
        const [locX, locZ] = [Number(apiLoc.x), Number(apiLoc.z)]

        return {
            x: truncX ? Math.trunc(locX) : locX,
            z: truncZ ? Math.trunc(locZ) : locZ
        }
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

    getDownloadAttachment() {
        const buf = Buffer.from(this.raw())
        return new AttachmentBuilder(buf, { 
            name: `${this.#apiNation.name}_NationEmbed.json` 
        })
    }

    // async tryGetColour() {
    //     const capitalColours = await Aurora.Towns.get(this.dbNation.capital.name).then((t: SquaremapTown) => {
    //         return t instanceof NotFoundError ? null : t.colours
    //     })

    //     return capitalColours ? parseInt(capitalColours.fill.replace('#', '0x')) : Colors.Aqua
    // }

    #filterNews(msg: Message) {
        const apiNationName = this.apiNation.name.toLowerCase()
        const msgContent = msg.content.toLowerCase()

        // Message includes nation name. Either exactly or where underscores became spaces.
        return msgContent.includes(apiNationName || apiNationName.replace(/_/g, " "))
    }

    async fetchAffiliatedAlliances() {
        const alliances = await database.Aurora.getAlliances()
        if (alliances) {
            console.error("Failed to fetch alliances.")
            return []
        }

        return alliances.filter(a => a.nations.map(e => e.toLowerCase()).includes(this.apiNation.name.toLowerCase()))
            .map(a => a.allianceName)
    }

    async fetchRecentNews() {
        const newsChannel = this.client.channels.cache.get(AURORA.newsChannel) as TextChannel
        const newsChannelMessages = await newsChannel?.messages.fetch()

        // Get news descriptions that include the nation name, then sort/get most recent description.
        const filteredMessages = newsChannelMessages?.filter(msg => this.#filterNews(msg))
        const mostRecentTimestamp = Math.max(...filteredMessages.map(e => e.createdTimestamp))

        // Grab most recent one by comparing timestamps.
        return new News(filteredMessages?.find(e => e.createdTimestamp === mostRecentTimestamp))
    }

    /**
     * Adds custom info (if set) from the database to the embed. The nation leader can set this information via the `/nationset` command.\
     * To see all current info that a leader can set, take a look at the choices of the 'type' option on the SlashCommandBuilder in `nationset.ts`.
     */
    addDbInfo() {
        
    }

    #setupEmbed() {
        const resLength = this.apiNation.residents.length
        
        const label = this.getLabel(resLength)
        //const rank = this.getRank(resLength)

        const kingPrefix = /* dbNation.kingPrefix | */ this.getLeaderPrefix(resLength)
        const bonus = auroraNationBonus(resLength)

        const spawnPoint = this.getSpawnPoint(true, true)
        const mapUrl = Aurora.buildMapLink(spawnPoint, 5)

        const area = Math.round(this.apiNation.stats.numTownBlocks)

        this.embed.setTitle(`Nation Info | ${backtick(label)}`)

        const foundedTimestamp = DiscordUtils.timestampDateTime(this.apiNation.timestamps.registered)
        this.embed.setDescription(`${this.apiNation.board}\n\nFounded on ${foundedTimestamp}.`)

        this.addField("Leader", backtick(this.apiNation.king.name, { prefix: kingPrefix }), true)
            .addField("Capital", backtick(this.apiNation.capital.name), true)
            .addField("Location", `[${spawnPoint.x}, ${spawnPoint.z}](${mapUrl.toString()})`, true)
            .addField("Residents", backtick(resLength.toString()), true)
            .addField("Size", `${DiscordUtils.EMOJI_CHUNK} ${backtick(area)} Chunks`, true)
            .addField("Bonus", `${DiscordUtils.EMOJI_CHUNK} ${backtick(bonus)} Chunks`, true)
            .addField("Balance", `${DiscordUtils.EMOJI_GOLD} ${backtick(this.apiNation.stats.balance)}G`, true)
            .addField("Towns", ``)
        
        const amtAlliances = this.affiliatedAlliances?.length
        if (amtAlliances > 0) {
            this.addField(`Alliances [${amtAlliances}]`, "```" + this.affiliatedAlliances.join(", ") + "```")
        }
    }

    createEmbed() {
        this.#setupEmbed()
        return this.embed
    }
}

export {
    NationHelper
}