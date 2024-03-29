import type { Client } from "discord.js"
import striptags from 'striptags'

import * as MC from '../bot/utils/minecraft.js'
import * as database from '../bot/utils/database.js'

import { 
    OfficialAPI, 
    Nova, Aurora,
    type OAPIResident, 
    type OnlinePlayer
} from 'earthmc'

import { type MCSessionProfile } from "../bot/types.js"

import { secToMs } from "../bot/utils/fn.js"
import { BaseHelper } from "./base.js"

class ResidentHelper extends BaseHelper {
    dbResident = null
    
    #apiResident: OAPIResident = null

    get apiResident() { return this.#apiResident }
    private set apiResident(val: OAPIResident) {
        this.#apiResident = val
    }

    onlinePlayer: OnlinePlayer = null

    pInfo = null

    player: MCSessionProfile = null
    
    status: "Online" | "Offline"

    constructor(client: Client, isNova = false) {
        super(client, isNova)
        this.embed.setColor('#A405BA')
    }

    addField(name: string, value: string, inline = false) {
        this.embed.addFields({ name, value, inline })
        return this.embed
    }

    async fetchResidents() {
        const arr = await (this.isNova ? database.Nova : database.Aurora).getResidents()
        return arr ? arr : await (this.isNova ? Nova : Aurora).Residents.all()
    }

    async init(input: string) {
        const arg1 = input?.toLowerCase()
        const p = await MC.Players.get(arg1).catch(err => { console.log(err); return null })

        if (!p) return false
        this.player = p

        const residents = await this.fetchResidents()
        this.dbResident = residents.find(r => r.name.toLowerCase() == arg1)

        const resName = this.dbResident?.name || arg1
        const ops = await (this.isNova ? Nova : Aurora).Players.online()

        const searchName = !this.dbResident ? arg1 : resName
        if (ops) this.onlinePlayer = ops.find(p => p.name.toLowerCase() == searchName) 

        if (!this.isNova) {
            let res: OAPIResident
            try {
                res = await OfficialAPI.resident(arg1)
            } catch (e) {
                console.log(e)
                return false
            }

            if (res.town) {
                const resTown = await OfficialAPI.town(res.town.toLowerCase())

                let rank = resTown.mayor == res.name ? "Mayor" : "Resident"
                if (rank == "Mayor" && resTown.status.isCapital) 
                    rank = "Nation Leader" 

                res['rank'] = rank
            }

            this.apiResident = res
        }

        this.status = this.onlinePlayer ? "Online" : "Offline"
        this.pInfo = await database.getPlayerInfo(resName, this.isNova).catch(e => console.log("Database error!\n" + e))

        this.tryAddAvatar()

        return true
    }

    async setupEmbed() {
        if (this.apiResident.town) await this.setupResidentEmbed()
        else await this.setupTownlessEmbed()
    }

    async setupTownlessEmbed() {
        const formattedPlayerName = this.player.name.replace(/_/g, "\\_")

        this.embed.setTitle(`(${this.isNova ? 'Nova' : 'Aurora'}) Player Info | ${formattedPlayerName}`)
        this.addField("Affiliation", "No Town", true)

        await this.addCommonFields()
    }

    async setupResidentEmbed() {
        const res = this.apiResident ?? this.dbResident,
              formattedPlayerName = res.name.replace(/_/g, "\\_"),
              affiliation = `${res.town ?? res.townName} (${res.nation ?? res.townNation})`

        this.embed.setTitle(`(${this.isNova ? 'Nova' : 'Aurora'}) Resident Info | ${formattedPlayerName}`)
        this.addField("Affiliation", affiliation, true)
        if (res.rank) this.addField("Rank", res.rank, true)

        this.tryAddNickname()
        await this.addCommonFields()
    }

    async addCommonFields() {
        if (this.apiResident) {
            this.addBalance(this.apiResident?.balance)
            this.addDatesFromAPI()
        }
        else this.addDatesFromDB()

        await this.addLinkedAcc()
    }

    addDatesFromAPI = () => {
        const timestamps = this.apiResident.timestamps,
              registeredTs = timestamps?.registered,
              lastOnlineTs = timestamps?.lastOnline

        const statusStr = this.status == "Offline" ? ":red_circle: Offline" : ":green_circle: Online"
        this.addField("Status", statusStr, true)

        if (lastOnlineTs != 0)
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
        if (!this.player) return
        this.embed.setThumbnail(`https://visage.surgeplay.com/bust/${this.player.id}.png?width=256&height=256`)
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

    addBalance = bal => this.addField("Balance", `${bal ?? 0}G`)

    addLinkedAcc = async () => {
        if (!this.player?.name) return

        const disc = this.pInfo?.discord
        if (disc && disc != "")
            this.addField("Linked Account", `<@${disc}>`)
    }
}

export {
    ResidentHelper
}