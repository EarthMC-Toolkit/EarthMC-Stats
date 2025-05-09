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
    Aurora,
    OfficialAPI
} from "earthmc"

import { 
    database,
    backtick,
    timestampRelative,
    EMOJI_CHUNK, EMOJI_GOLD,
    AURORA, auroraNationBonus,
    backticks
} from "../../../bot/utils/index.js"

import News from "../../../bot/objects/News.js"
import CommandLookup from "./base.js"

export default class NationLookup extends CommandLookup {
    #apiNation: RawNationV3 = null
    get apiNation() { return this.#apiNation }

    #recentNews: News = null
    get recentNews() { return this.#recentNews }

    #affiliatedAlliances: string[] = []
    get affiliatedAlliances() { return this.#affiliatedAlliances }

    constructor(client: Client) {
        super(client)
        this.embed.setColor(Colors.Aqua) // Default, overriden if nation has a custom one
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
            x: truncX ? ~~locX : locX,
            z: truncZ ? ~~locZ : locZ
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
        const alliances = await database.AuroraDB.getAlliances()
        if (alliances) {
            console.error("Failed to fetch alliances.")
            return []
        }

        return alliances.filter(a => 
            a.nations.map(e => e.toLowerCase()).includes(this.apiNation.name.toLowerCase())
        ).map(a => a.allianceName)
    }

    async fetchRecentNews() {
        const newsChannel = this.client.channels.cache.get(AURORA.newsChannel) as TextChannel
        const newsChannelMessages = await newsChannel?.messages.fetch()

        // Get news descriptions that include the nation name, then sort/get most recent description.
        const filteredMessages = newsChannelMessages?.filter(msg => this.#filterNews(msg))
        const mostRecentTimestamp = Math.max(...filteredMessages.map(e => e.createdTimestamp))

        // Grab most recent one by comparing timestamps.
        const recent = filteredMessages?.find(e => e.createdTimestamp === mostRecentTimestamp)
        return recent ? new News(recent) : null
    }

    /**
     * Adds custom info (if set) from the database to the embed. The nation leader can set this information via the `/nationset` command.\
     * To see all current info that a leader can set, take a look at the choices of the 'type' option on the SlashCommandBuilder in `nationset.ts`.
     */
    addDbInfo() {
        
    }

    createEmbed() {
        const resLength = this.apiNation.residents.length
        
        const label = this.getLabel(resLength)
        const foundedTimestamp = timestampRelative(this.apiNation.timestamps.registered)

        const kingPrefix = /* dbNation.kingPrefix | */ this.getLeaderPrefix(resLength)

        const spawnPoint = this.getSpawnPoint(true, true)
        const mapUrl = new Aurora.URLBuilder(spawnPoint, 5)

        const bonus = auroraNationBonus(resLength)
        const area = Math.round(this.apiNation.stats.numTownBlocks)

        this.embed.setTitle(`Nation Info | ${backtick(label)}`)
            .setDescription(`*${this.apiNation.board}*`)
            .setThumbnail(/*this.dbNation.flag ||*/ 'attachment://aurora.png')
            
        this.addField("Founded", foundedTimestamp, true)
            .addField("Leader", backtick(this.apiNation.king.name, { prefix: kingPrefix }), true)
            .addField("Capital", backtick(this.apiNation.capital.name), true)
            .addField("Location", `[${spawnPoint.x}, ${spawnPoint.z}](${mapUrl.getAsString()})`, true)
            .addField("Residents", backtick(resLength.toString()), true)
            .addField("Balance", `${EMOJI_GOLD} ${backtick(this.apiNation.stats.balance)}G`, true)
            .addField("Size", `${EMOJI_CHUNK} ${backtick(area)} Chunks`, true)
            .addField("Bonus", `${EMOJI_CHUNK} ${backtick(bonus)} Chunks`, true)

        const amtAlliances = this.affiliatedAlliances?.length
        if (amtAlliances > 0) {
            this.addField(`Alliances [${amtAlliances}]`, backticks(this.affiliatedAlliances.join(", ")))
        }

        if (this.recentNews) {
            const img = this.recentNews?.images ? this.recentNews.images[0] : null
            const link = img ? ` ([Image](${img}))` : ""

            this.addField("Recent News", this.recentNews.message + link)
        }

        return this.embed
    }
}