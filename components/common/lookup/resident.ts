import type { AttachmentBuilder, Client } from "discord.js"

import type { Resident, RawPlayerV3 } from 'earthmc'
import { OfficialAPI, Aurora } from 'earthmc'

import striptags from 'striptags'

import BaseCommandHelper from "./base.js"
import * as MC from '../../../bot/utils/minecraft.js'

import { 
    database,
    backtick, buildSkinURL,
    timestampRelative, timestampDateTime
} from "../../../bot/utils/index.js"

import { 
    type DBPlayer,
    type DBResident,
    type MCSessionProfile,
    SkinType3D
} from "../../../bot/types.js"

const DEFAULT_ABOUT = "/res set about [msg]"

export default class ResidentLookup extends BaseCommandHelper {
    dbResident: DBResident | Resident = null
    dbPlayer: DBPlayer
    
    #apiResident: RawPlayerV3 = null
    get apiResident() { return this.#apiResident }

    onlinePlayer: { name: string } = null

    mcProfile: MCSessionProfile = null
    status: "Online" | "Offline"

    constructor(client: Client) {
        super(client)
        this.embed.setColor('#A405BA')
    }

    async fetchResidents() {
        const arr = await database.AuroraDB.getResidents()
        return arr ? arr : await Aurora.Residents.all()
    }

    async init(input: string) {
        const arg1 = input?.toLowerCase()

        this.mcProfile = await MC.Players.get(arg1).catch(() => null)

        //#region Get resident from OAPI.
        let apiRes: RawPlayerV3 = null
        try {
            const players = await OfficialAPI.V3.players(arg1)
            apiRes = players[0]

            if (!apiRes) {
                // No need to throw, we just didn't find them and that's fine.
                console.warn(`Official API could not find resident: ${arg1}`)
            }
        } catch(e: any) {
            console.error(e)
            //return false // TODO: Just serve player embed without OAPI info if db fallback found.
        }
        //#endregion

        // At this point, we can be quite sure this player doesn't exist since
        // both the OAPI and MCAPI will rarely be both down at the same time.
        if (!apiRes && !this.mcProfile) {
            return false
        }

        //#region Fetch resident from Cache/DB or NPM as fallback.
        const residents = await this.fetchResidents()
        this.dbResident = residents.find(r => r.name.toLowerCase() == arg1)
        //#endregion

        //#region Set the online player info
        const resName = this.dbResident?.name || arg1
        const ops = await Aurora.Players.online()

        const searchName = !this.dbResident ? arg1 : resName
        if (ops) this.onlinePlayer = ops.find(p => p.name.toLowerCase() == searchName.toLowerCase()) 
        //#endregion

        if (apiRes) {
            this.#apiResident = apiRes

            if (apiRes.town?.name) {
                const resTown = await OfficialAPI.V3.towns(apiRes.town.name.toLowerCase()).then(arr => arr[0])

                const isMayor = resTown.mayor.name == apiRes.name
                const rank = isMayor ? (resTown.status.isCapital ? "Nation Leader" : "Mayor") : "Resident"
                
                apiRes['rank'] = rank
            }
        }
        
        if (this.dbResident) {
            this.dbPlayer = await database.getPlayer(resName).catch(e => {
                console.error(`DB error occurred getting resident ${resName}:\n${e}`)
                return null
            })
        }
        
        this.status = this.onlinePlayer ? "Online" : "Offline"
        this.tryAddAvatar()

        return true
    }

    createEmbed() {
        if (!this.apiResident) {
            this.#setupMcProfileEmbed()
        } else {
            if (this.apiResident.town?.uuid) this.#setupResidentEmbed()
            else this.#setupTownlessEmbed()
        }

        return this.embed
    }

    getDownloadAttachment(): AttachmentBuilder {
        throw new Error("Method not implemented.")
    }

    #setupMcProfileEmbed() {
        this.embed.setTitle(`Player Info | ${backtick(this.mcProfile.name)}`)
        this.embed.setDescription(`*This player is not registered on EarthMC.*`)
        this.addField("Minecraft UUID", backtick(this.mcProfile.id))
    }

    #setupTownlessEmbed() {
        // TODO: mcProfile could be null, handle this case.
        //const formattedPlayerName = this.mcProfile.name.replace(/_/g, "\\_")

        this.embed.setTitle(`Player Info | ${backtick(this.mcProfile.name)}`)
        this.addField("Affiliation", "No Town", true)

        this.addCommonFields()
    }

    #setupResidentEmbed() {
        const res: any = this.apiResident || this.dbResident
        //const formattedPlayerName = res.name.replace(/_/g, "\\_")
        
        // Tries OAPI then tries DB/Cache then tries NPM.
        const affiliatedTown = (res.town?.name ?? res.townName) ?? res.town
        const affiliatedNation = (res.nation?.name ?? res.townNation) ?? res.nation

        this.embed.setTitle(`Resident Info | ${backtick(res.name)}`)

        if (res.about && res.about != DEFAULT_ABOUT) {
            this.embed.setDescription(`*${res.about}*`)
        }

        this.addField("Affiliation", `${affiliatedTown} (${affiliatedNation})`, true)
        if (res.rank) this.addField("Rank", res.rank, true)

        this.tryAddNickname()
        this.addCommonFields()
    }

    addCommonFields() {
        if (this.apiResident) {
            this.addBalance(this.apiResident.stats?.balance)
            this.addDatesFromAPI()
        } else this.addDatesFromDB()

        const uuid = this.mcProfile?.id || this.apiResident?.uuid
        this.addField("Minecraft UUID", uuid ? backtick(uuid) : "Unavailable")

        //this.addLinkedAcc()
    }

    addDatesFromAPI() {
        const timestamps = this.apiResident.timestamps // Should usually be ms.
        const registeredTs = timestamps?.registered
        const lastOnlineTs = timestamps?.lastOnline

        const statusStr = this.status == "Offline" ? ":red_circle: Offline" : ":green_circle: Online"
        this.addField("Status", statusStr, true)

        if (lastOnlineTs && this.status == "Offline") {
            this.addField("Last Online", timestampRelative(lastOnlineTs), true)
        }

        if (registeredTs) {
            this.addField("Registered", timestampDateTime(registeredTs), true)
        }
    }

    addDatesFromDB() {
        const lastOnline = this.dbPlayer?.lastOnline
        if (!lastOnline) return

        // Unix epoch (January 1, 1970) or earlier.
        if (lastOnline.aurora?.seconds <= 0) return

        if (this.status == "Offline") {
            this.addField("Last Online", timestampRelative(lastOnline.aurora), true)
        }
    }

    tryAddAvatar() {
        if (!this.mcProfile?.id) return

        this.embed.setThumbnail(buildSkinURL({ 
            view: SkinType3D.BUST, 
            subject: this.mcProfile.id
        }))
    }

    tryAddNickname() {
        if (this.status == "Online") {
            const opName = this.onlinePlayer.name
            const nickname = striptags(opName)

            // If the player has a nickname, add the Nickname field.
            if (opName !== nickname && nickname.length > 0) {
                this.addField("Nickname", nickname, true)
            }
        }
    }

    addBalance(bal: string | number) {
        this.addField("Balance", `<:gold:1318944918118600764> ${backtick(bal ?? 0)}G`, true)
    }

    // addLinkedAcc = () => {
    //     const disc = this.pInfo?.discord
    //     if (disc && disc != "") {
    //         this.addField("Linked Account", `<@${disc}>`)
    //     }
    // }
}