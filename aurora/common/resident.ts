import type { Client } from "discord.js"
import striptags from 'striptags'

import * as MC from '../../bot/utils/minecraft.js'
import * as database from '../../bot/utils/database.js'

import {
    OfficialAPI, 
    Aurora,
    type Resident
} from 'earthmc'

import { 
    type V3Player,
    type DBResident,
    type MCSessionProfile,
    type SkinOpts,
    SkinType3D
} from "../../bot/types.js"

import { secToMs } from "../../bot/utils/fn.js"
import { BaseHelper } from "./base.js"

const buildSkinURL = (opts: SkinOpts) => {
    const domain = "https://visage.surgeplay.com/"
    const params = `?width=${opts.width ?? 256}&height=${opts.height ?? 256}`

    return `${domain}${opts.view}/${opts.subject}.png${params}`
}

const defaultAbout = "/res set about [msg]"

class ResidentHelper extends BaseHelper {
    dbResident: DBResident | Resident = null
    
    #apiResident: V3Player = null
    get apiResident() { return this.#apiResident }

    onlinePlayer: { name: string } = null
    pInfo: any = null
    mcProfile: MCSessionProfile = null
    status: "Online" | "Offline"

    constructor(client: Client) {
        super(client)
        this.embed.setColor('#A405BA')
    }

    async fetchResidents() {
        const arr = await database.Aurora.getResidents()
        return arr ? arr : await Aurora.Residents.all()
    }

    async init(input: string) {
        const arg1 = input?.toLowerCase()

        this.mcProfile = await MC.Players.get(arg1).catch(() => null)

        const residents = await this.fetchResidents()
        this.dbResident = residents.find(r => r.name.toLowerCase() == arg1)

        const resName = this.dbResident?.name || arg1
        const ops = await Aurora.Players.online()

        const searchName = !this.dbResident ? arg1 : resName
        if (ops) this.onlinePlayer = ops.find(p => p.name.toLowerCase() == searchName) 

        let res: V3Player
        try {
            // This is currently necessary bc the return type from EMC-NPM is not accurate.
            const arr = await OfficialAPI.V3.players(arg1) as unknown as V3Player[]
            res = arr[0]
        } catch (e) {
            console.log(e)
            return false
        }

        if (res.town?.uuid) {
            const resTown = await OfficialAPI.V2.town(res.town.name.toLowerCase())

            let rank = resTown.mayor == res.name ? "Mayor" : "Resident"
            if (rank == "Mayor" && resTown.status.isCapital) 
                rank = "Nation Leader" 

            res['rank'] = rank
        }

        this.#apiResident = res

        this.status = this.onlinePlayer ? "Online" : "Offline"
        this.pInfo = await database.getPlayerInfo(resName).catch(e => console.log(`Database error!\n${e}`))

        this.tryAddAvatar()

        return true
    }

    createEmbed() {
        if (this.apiResident?.town?.uuid) this.#setupResidentEmbed()
        else this.#setupTownlessEmbed()

        return this.embed
    }

    #setupResidentEmbed() {
        const res: any = this.apiResident || this.dbResident
        //const formattedPlayerName = res.name.replace(/_/g, "\\_")
        
        const affiliation = {
            town: (res.town?.name ?? res.town) ?? res.townName,
            nation: (res.nation?.name ?? res.nation) ?? res.townNation
        }

        this.embed.setTitle(`Resident Info | \`${res.name}\``)

        if (res.about && res.about != defaultAbout) {
            this.embed.setDescription(`*${res.about}*`)
        }

        this.addField("Affiliation", `${affiliation.town} (${affiliation.nation})`, true)
        if (res.rank) this.addField("Rank", res.rank, true)

        this.tryAddNickname()
        this.addCommonFields()
    }

    #setupTownlessEmbed() {
        // TODO: mcProfile could be null, handle this case.
        //const formattedPlayerName = this.mcProfile.name.replace(/_/g, "\\_")

        this.embed.setTitle(`Player Info | \`${this.mcProfile.name}\``)
        this.addField("Affiliation", "No Town", true)

        this.addCommonFields()
    }

    addCommonFields() {
        if (this.apiResident) {
            this.addBalance(this.apiResident?.stats?.balance)
            this.addDatesFromAPI()
        } else this.addDatesFromDB()

        this.addLinkedAcc()
    }

    addDatesFromAPI = () => {
        const timestamps = this.apiResident.timestamps
        const registeredTs = timestamps?.registered ?? 0
        const lastOnlineTs = timestamps?.lastOnline ?? 0

        const statusStr = this.status == "Offline" ? ":red_circle: Offline" : ":green_circle: Online"
        this.addField("Status", statusStr, true)

        if (lastOnlineTs != 0 && this.status == "Offline")
            this.addField("Last Online", `<t:${secToMs(lastOnlineTs)}:R>`, true)

        if (registeredTs != 0)
            this.addField("Registered", `<t:${secToMs(registeredTs)}:F>`, true)
    }

    addDatesFromDB = () => {
        const lastOnlineTs = this.pInfo?.lastOnline?.nova
        if (!lastOnlineTs || lastOnlineTs == 0) return

        if (this.status == "Offline")
            this.addField("Last Online", `<t:${lastOnlineTs}:R>`, true)
    }

    tryAddAvatar = () => {
        if (!this.mcProfile) return

        this.embed.setThumbnail(buildSkinURL({ 
            view: SkinType3D.BUST, 
            subject: this.mcProfile.id
        }))
    }

    tryAddNickname = () => {
        if (this.status == "Online") {
            const opName = this.onlinePlayer.name
            const nickname = striptags(opName)

            // If the player has a nickname, add the Nickname field.
            if (opName !== nickname && nickname.length > 0)
                this.addField("Nickname", nickname, true)
        }
    }

    addBalance = (bal: string | number) => this.addField("Balance", `\`${bal ?? 0}\`G`, true)

    addLinkedAcc = () => {
        if (!this.mcProfile?.name) return

        const disc = this.pInfo?.discord
        if (disc && disc != "")
            this.addField("Linked Account", `<@${disc}>`)
    }
}

export {
    ResidentHelper
}