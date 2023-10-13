const database = require('../bot/utils/database'),
      emc = require('earthmc'),
      MC = require('../bot/utils/minecraft'),
      striptags = require('striptags'),
      { BaseHelper } = require("./base"),
      fn = require('../bot/utils/fn')

class ResidentHelper extends BaseHelper {
    dbResident = null
    apiResident = null

    onlinePlayer = null
    pInfo = null

    player = null
    status = ''

    constructor(client, isNova = false) {
        super(client, isNova)
        this.embed.setColor('#A405BA')
    }

    async fetchResidents() {
        const arr = await (this.isNova ? database.Nova : database.Aurora).getResidents()
        return arr ? arr : await (this.isNova ? emc.Nova : emc.Aurora).Residents.all()
    }

    /**
     * @param { string[] } args 
     * @param { boolean } isInteraction 
     */
    async init(args, isInteraction = false) {
        const arg1 = isInteraction ? args : args[0]

        const residents = await this.fetchResidents()
        this.dbResident = residents.find(r => r.name.toLowerCase() == arg1.toLowerCase())

        const resName = this.dbResident?.name || arg1
        const ops = await (this.isNova ? emc.Nova : emc.Aurora).Players.online().catch(() => {})

        const searchName = !this.dbResident ? arg1.toLowerCase() : resName
        if (ops) this.onlinePlayer = ops.find(p => p.name.toLowerCase() == searchName) 

        if (!this.isNova) {
            try {
                const res = await emc.OfficialAPI.resident(arg1.toLowerCase())

                console.log(res)
                const resTown = await emc.OfficialAPI.town(res.town.toLowerCase())

                let rank = resTown.mayor == res.name ? "Mayor" : "Resident"
                if (rank == "Mayor" && resTown.status.isCapital) 
                    rank = "Nation Leader" 

                res.rank = rank
                this.apiResident = res
            } catch (e) {
                console.log(e)
            }
        }

        this.status = this.onlinePlayer ? "Online" : "Offline"
        this.player = await MC.Players.get(resName).catch(console.log)
        this.pInfo = await database.getPlayerInfo(resName, this.isNova).catch(e => console.log("Database error!\n" + e))

        this.tryAddAvatar()
    }

    async setupTownlessEmbed() {
        const formattedPlayerName = this.player.name.replace(/_/g, "\\_")

        this.embed.setTitle(`(${this.isNova ? 'Nova' : 'Aurora'}) Player Info | ${formattedPlayerName}`)
                  .addFields(fn.embedField("Affiliation", "No Town", true))

        await this.addCommonFields()
    }

    async setupResidentEmbed() {
        const res = this.apiResident ?? this.dbResident,
              formattedPlayerName = res.name.replace(/_/g, "\\_"),
              affiliation = `${res.town ?? res.townName} (${res.nation ?? res.townNation})`

        this.embed.setTitle(`(${this.isNova ? 'Nova' : 'Aurora'}) Resident Info | ${formattedPlayerName}`)
        this.embed.addFields(fn.embedField("Affiliation", affiliation, true))
        if (res.rank) this.embed.addFields(fn.embedField("Rank", res.rank, true))

        this.tryAddNickname()
        await this.addCommonFields()
    }

    async addCommonFields() {
        if (this.apiResident) {
            this.addBalance(this.apiResident.stats?.balance)
            this.addStatus()
            this.addDatesFromAPI()
        }
        else {
            this.addStatus()
            this.addDatesFromDB()
        }

        await this.addLinkedAcc()
    }

    addDatesFromAPI = () => {
        const timestamps = this.apiResident.timestamps,
              registeredTs = timestamps?.registered,
              lastOnlineTs = timestamps?.lastOnline
              
        let tempTs = 0
        if (registeredTs != 0) {
            tempTs = `<t:${fn.secToMs(registeredTs)}:F>`
            this.embed.addFields(fn.embedField("Registered", tempTs, true))
        }
            
        if (this.status == "Offline" && lastOnlineTs != 0) {
            tempTs = `<t:${fn.secToMs(lastOnlineTs)}:R>`
            this.embed.addFields(fn.embedField("Last Online", tempTs, true))
        }
    }

    addDatesFromDB = () => {
        const lastOnlineTs = this.pInfo?.lastOnline?.nova
        if (!lastOnlineTs || lastOnlineTs == 0) return

        if (this.status == "Offline")
            this.embed.addFields(fn.embedField("Last Online", `<t:${lastOnlineTs}:R>`, true))
    }

    tryAddAvatar = () => {
        if (!this.player) return
        this.embed.setThumbnail(`https://visage.surgeplay.com/bust/${this.player.id}.png?y=3&p=4`)
    }

    tryAddNickname = () => {
        if (this.status == "Online") {
            const opName = this.onlinePlayer.name
            const nickname = striptags(opName)

            // If the player has a nickname, add the Nickname field.
            if (opName !== nickname && nickname.length > 0)
                this.embed.addFields(fn.embedField("Nickname", nickname, true))
        }
    }

    addBalance = bal => this.embed.addFields(fn.embedField("Balance", `${bal ?? 0}G`, true))
    addStatus = () => this.embed.addFields(fn.embedField("Status", this.status, true))

    addLinkedAcc = async () => {
        if (!this.player?.name) return

        const disc = this.pInfo?.discord
        if (disc && disc != "")
            this.embed.addFields(fn.embedField("Linked Account", `<@${disc}>`, true))
    }
}

module.exports = {
    ResidentHelper
}