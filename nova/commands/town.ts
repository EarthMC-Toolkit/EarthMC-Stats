import { Colors, EmbedBuilder } from "discord.js"
import type { Message, Client } from "discord.js"

import { Nova, formatString, NotFoundError } from "earthmc"
import { CustomEmbed, EntityType } from "../../bot/objects/CustomEmbed.js"

import * as fn from '../../bot/utils/fn.js'
import * as database from "../../bot/utils/database.js"

export default {
    name: "town",
    description: "Displays info for a town.",
    aliases: ["t"],
    run: async (client: Client, message: Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching town data, this might take a moment.")
            .setColor(Colors.Green)]
        })

        if (!req) return await m.edit({ embeds: [new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("Command Usage")
            .setDescription("`/town <name>`\n`/town list`")
        ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
        
        const townEmbed = new EmbedBuilder()
        
        database.Nova.getTowns().then(async towns => {
            if (!towns) towns = await Nova.Towns.all().catch(err => console.log(err))

            towns = towns.map(t => {
                t.name = formatString(t.name, false)
                return t
            })

            if (args[0].toLowerCase() == "list") {
                if (args[1] != null) {
                    if (args[1].toLowerCase() == "online") {
                        const onlinePlayers = await Nova.Players.online().catch(() => {})
                        if (!onlinePlayers) return await m.edit({ embeds: [fn.fetchError] })
                            .then(m => setTimeout(() => m.delete(), 10000))
                            .catch(() => {})

                        const onlineTownData = []
                        const onlineTownDataFinal = []

                        const len = towns.length
                        for (let i = 0; i < len; i++) {
                            const curTown = towns[i]

                            onlineTownData.push({
                                name: curTown.name,
                                nation: curTown.nation,
                                residentNames: curTown.residents,
                                onlineResidents: [],
                                onlineResidentAmount: 0
                            }) 
                        }

                        // Function to get rid of duplicates and add up residents and chunks.
                        onlineTownData.forEach(function (a) {                   
                            // If town doesnt exist, add it.
                            if (!this[a.name]) {           
                                a.onlineResidents = a.residentNames.filter(res => onlinePlayers.find(op => res === op.name))

                                this[a.name] = { 
                                    name: a.name, 
                                    nation: a.nation,
                                    onlineResidents: a.onlineResidents,
                                    onlineResidentAmount: a.onlineResidents.length
                                }    

                                onlineTownDataFinal.push(this[a.name])
                            }     
                        }, Object.create(null))

                        let page = 1

                        if (args[2] != null) if (req.split(" ")[2])  page = parseInt(req.split(" ")[2])
                        else if (req.split(" ")[1]) page = parseInt(req.split(" ")[1])

                        if (isNaN(page)) page = 0
                        else page--

                        onlineTownDataFinal.sort(function(a, b) { return b.onlineResidentAmount - a.onlineResidentAmount })
                        const allData = onlineTownDataFinal.map(town => `${town.name} (${town.nation}) - ${town.onlineResidentAmount}`).join('\n').match(/(?:^.*$\n?){1,10}/mg)

                        new CustomEmbed(client, "Town Info | Online Resident List")
                            .setType(EntityType.Town).setPage(page)
                            .paginate(allData, "```", "```")
                            .editMessage(m)
                    }
                    else if (args[1].toLowerCase() == "residents") {          
                        towns.sort((a, b) => { return b.residents.length - a.residents.length })               
                    }
                    else if (args[1].toLowerCase() == "chunks" || args[1].toLowerCase() == "land" || args[1].toLowerCase() == "area") {
                        towns.sort((a, b) => { return b.area - a.area }) 
                    }
                    else if (args[1].toLowerCase() == "name" || args[1].toLowerCase() == "alphabetical") {
                        towns.sort((a, b) => {                       
                            if (b.name.toLowerCase() < a.name.toLowerCase()) return 1
                            if (b.name.toLowerCase() > a.name.toLowerCase()) return -1
                            
                            if (b.residents.length > a.residents.length) return 1
                            if (b.residents.length < a.residents.length) return -1

                            if (b.area > a.area) return 1
                            if (b.area < a.area) return -1

                            return 0
                        })
                    }
                    else { // /t list <nation>
                        const foundNation = towns.find(town => town.nation.toLowerCase() == args[1].toLowerCase())
                        
                        if (!foundNation) towns = fn.defaultSort(towns)
                        else {
                            // Set towns array to the filtered array (only towns that are in the specified nation)
                            towns = towns.filter(town => town.nation.toLowerCase() == args[1].toLowerCase())
                            
                            if (args[2] != null) {
                                const arg2 = args[2].toLowerCase()

                                if (arg2 == "area" || arg2 == "chunks") {
                                    fn.sortByOrder(towns, [{ key: 'area' }])
                                }
                                else if (arg2 == "residents") {
                                    fn.sortByOrder(towns, [{ key: 'residents', callback: k => k.length }])
                                }
                                else if (arg2 == "alphabetical" || arg2 == "name") {
                                    fn.alphabetSort(towns, 'name')
                                }
                            }
                            else towns = fn.defaultSort(towns)
                        }
                    }
                    
                    if (args[1].toLowerCase() != "online") {
                        const townData = []
                        const len = towns.length

                        for (let i = 0; i < len; i++) {  
                            const curTown = towns[i]
                            
                            townData.push({
                                name: curTown.name,
                                nation: curTown.nation,
                                residentNames: curTown.residents,
                                area: curTown.area
                            }) 
                        }        

                        let page = 1 
                        const splitReq = req.split(" ")

                        if (args[3] != null && Number.isInteger(args[3])) 
                            if (splitReq[3]) page = parseInt(splitReq[3])
                        else if (args[2] != null && Number.isInteger(args[2])) 
                            if (splitReq[2]) page = parseInt(splitReq[2])
                        else               
                            if (splitReq[1]) page = parseInt(splitReq[1])

                        if (isNaN(page)) page = 0
                        else page--

                        const allData = townData.map((town, index) => (index + 1) + ". **" + town.name + " (" + town.nation + ")**" + 
                            "\n```Residents: " + town.residentNames.length + "``````Chunks: " + town.area + "```")
                        .join('\n').match(/(?:^.*$\n?){1,8}/mg)

                        new CustomEmbed(client, "(Nova) Town Info | Town List")
                            .setType(EntityType.Town).setPage(page).paginate(allData, "\n")
                            .setFooter({text: `Page ${page}/${allData.length}` + " | Total: " + len, iconURL: client.user.avatarURL()})
                            .editMessage(m)
                    }
                }
                else { // No args (/t list)
                    towns = fn.defaultSort(towns)
                    
                    const townData = []
                    const len = towns.length

                    for (let i = 0; i < len; i++) {        
                        const curTown = towns[i]

                        townData.push({
                            name: curTown.name,
                            nation: curTown.nation,
                            residents: curTown.residents,
                            area: curTown.area
                        }) 
                    }

                    let page = 1
                    if (isNaN(page)) page = 0
                    else page--

                    const allData = townData.map((town, index) => (index + 1) + ". **" + town.name + " (" + town.nation + ")**" + 
                        "\n```Residents: " + town.residents.length + "``````Chunks: " + town.area + "```"
                    ).join('\n').match(/(?:^.*$\n?){1,8}/mg)

                    new CustomEmbed(client, "(Nova) Town Info | Town List")
                        .setType(EntityType.Town).setPage(page).paginate(allData, "\n")
                        .setFooter({text: `Page ${page}/${allData.length}` + " | Total: " + len, iconURL: client.user.avatarURL()})
                        .editMessage(m)
                }
            }
            else if (args[0].toLowerCase() == "activity" && args[1] != null) {
                    const town = towns.find(t => t.name.toLowerCase() == args[1].toLowerCase())

                    if (!town) return m.edit({embeds: [
                        new EmbedBuilder()
                        .setTitle("Invalid town name!")
                        .setDescription(args[1] + " doesn't seem to be a valid town name, please try again.")
                        .setTimestamp().setColor(Colors.Red)
                    ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                    database.getPlayers().then(async players => {
                        if (!players) return await m.edit({embeds: [fn.databaseError]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                        // Sort by highest offline duration
                        town.residents.sort((a, b) => {
                            const foundPlayerA = players.find(p => p.name == a),
                                  foundPlayerB = players.find(p => p.name == b)

                            if (foundPlayerA && !foundPlayerB) return -1
                            if (!foundPlayerA && foundPlayerB) return 1

                            if (foundPlayerA && foundPlayerB) {
                                if (foundPlayerA.lastOnline.nova == foundPlayerB.lastOnline.nova) return 0 // identical? return 0 
                                else if (foundPlayerA.lastOnline.nova == null) return 1 // a is null? last 
                                else if (foundPlayerB.lastOnline.nova == null) return -1 // b is null? last

                                const dateB = fn.unixFromDate(foundPlayerB.lastOnline.nova),
                                      dateA = fn.unixFromDate(foundPlayerA.lastOnline.nova)

                                return dateB - dateA
                            }
                        })

                        let page = 1
                        if (isNaN(page)) page = 0
                        else page--

                        const allData = town.residents.map(resident => {
                            const residentInPlayers = players.find(p => p.name == resident)

                            if (residentInPlayers && residentInPlayers.lastOnline.nova != null) 
                                return "``" + resident + "`` - " + `<t:${fn.unixFromDate(residentInPlayers.lastOnline.nova)}:R>`

                            return "" + resident + " | Unknown"
                        }).join('\n').match(/(?:^.*$\n?){1,10}/mg)

                        const townColours = await Nova.Towns.get(town.name).then((t: any) => {
                            return t instanceof NotFoundError ? null : t.colourCodes
                        })

                        const colour = !townColours ? Colors.Green : parseInt(townColours.fill.replace('#', '0x'))
                        new CustomEmbed(client, "(Nova) Town Info | Activity in " + town.name)
                            .setColor(colour)
                            .setType(EntityType.Town).setPage(page)
                            .paginate(allData)
                            .editMessage(m)
                    })
            }
            else if (args.length > 3 || args.length == null || args[0] == null) {
                return await m.edit({embeds: [new EmbedBuilder()
                    .setDescription("Invalid arguments! Usage: `/t townName` or `/t list`")
                    .setFooter(fn.devsFooter(client))
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp()
                    .setColor(Colors.Red)
                ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
            }
            else { // /t <town>
                const town = towns.find(t => t.name.toLowerCase() == args[0].toLowerCase())

                if (!town) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Invalid town name!")
                    .setDescription(args[0] + " doesn't seem to be a valid town name, please try again.")
                    .setTimestamp().setColor(Colors.Red)
                ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                let onlineResidents = [],
                    claimBonus = 0

                towns = fn.defaultSort(towns)

                const townRank = (towns.findIndex(t => t.name == town.name)) + 1
                const mayor = town.mayor.replace(/_/g, "\\_")
                
                const townColours = await Nova.Towns.get(town.name).then((t: any) => {
                    return t instanceof NotFoundError ? null : t.colourCodes
                })

                const colour = !townColours ? Colors.Green : parseInt(townColours.fill.replace('#', '0x'))
                townEmbed.setColor(town.ruined ? Colors.Orange : colour)
                    .setTitle(("Town Info | " + town.name + `${town.capital ? " :star:" : ""}`) + (town.ruined ? " (Ruin)" : " | #" + townRank))
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                
                const townNation = await database.Nova.getNation(town.nation).catch(() => {}) ?? await Nova.Nations.get(town.nation),
                      townResidentsLength = town.residents.length

                if (!town.ruined) {
                    if (town.capital) {
                        const nationResidentsLength = townNation?.residents.length ?? 0

                        townEmbed.addFields(fn.embedField("Mayor",
                            `${nationResidentsLength >= 60 ? "God Emperor "
                            : nationResidentsLength >= 40 ? "Emperor "
                            : nationResidentsLength >= 30 ? "King "
                            : nationResidentsLength >= 20 ? "Duke "
                            : nationResidentsLength >= 10 ? "Count "
                            : nationResidentsLength >= 0 ? "Leader " : ""}` + mayor, true
                        ))
                    } else {
                        townEmbed.addFields(fn.embedField("Mayor", 
                            `${townResidentsLength >= 28 ? "Lord "
                            : townResidentsLength >= 24 ? "Duke "
                            : townResidentsLength >= 20 ? "Earl "
                            : townResidentsLength >= 14 ? "Count "
                            : townResidentsLength >= 10 ? "Viscount "
                            : townResidentsLength >= 6 ? "Baron "
                            : townResidentsLength >= 2 ? "Chief "
                            : townResidentsLength == 1 ? "Hermit " : "" }` +  mayor, true
                        ))   
                    }

                    const nationString = !townNation?.discord || townNation.discord == "" 
                        ? town.nation : "[" + townNation.name + "]" + "(" + townNation.discord + ")"
                                    
                    townEmbed.addFields(fn.embedField("Nation", nationString, true))
                }

                claimBonus = town.residents.length * 12
                let townSizeStr = `${town.area} / ${Math.min(claimBonus, fn.maxTownSize)}`

                if (town.nation != "No Nation") {
                    const nationBonus = fn.novaNationBonus(townNation.residents.length)
                    claimBonus += nationBonus

                    townSizeStr = `${town.area} / ${Math.min(claimBonus, fn.maxTownSize)} [NationBonus: ${nationBonus}]`
                }
                
                townEmbed.addFields(fn.embedField("Town Size", townSizeStr))

                const locStr = "[" + town.x + ", " + town.z + "]" + 
                    "(https://earthmc.net/map/nova/?worldname=earth&mapname=flat&zoom=6&x=" + town.x + "&y=64&z=" + town.z + ")"

                townEmbed.addFields(fn.embedField("Location", locStr, true))
                    .setThumbnail('attachment://nova.png')
                    .setFooter(fn.devsFooter(client))
                    .setTimestamp()

                if (!town.ruined) {
                    // RESIDENTS
                    if (townResidentsLength > 0) {
                        if (townResidentsLength <= 50) townEmbed.addFields(fn.embedField(
                            `Residents [${townResidentsLength}]`, 
                            "```" +  town.residents.join(", ") + "```"
                        ))      
                        else townEmbed.addFields(fn.embedField("Residents", townResidentsLength.toString()))
                    } 
                    else townEmbed.addFields(fn.embedField("Residents", "There are no residents in this town?"))   

                    // ONLINE RESIDENTS
                    const townyData = await database.Nova.getOnlinePlayerData() as any
                    if (!townyData) {
                        townEmbed.addFields(fn.embedField(
                            "Online Residents", 
                            `No residents are online in ${town.name}`
                        ))
                    }
                    else {
                        onlineResidents = fn.removeDuplicates(town.residents.filter(res => townyData.players.find(op => res === op.account)))
                        const onlineResidentsString = onlineResidents.toString().replace(/,/g, ", ")
                        const onlineResidentsLen = onlineResidents.length

                        if (onlineResidentsLen > 0) townEmbed.addFields(fn.embedField(
                            `Online Residents [${onlineResidentsLen}]`, 
                            "```" + onlineResidentsString + "```"
                        ))
                        else townEmbed.addFields(fn.embedField(
                            "Online Residents", 
                            "No residents are online in " + town.name
                        ))
                    }
                }

                const [green, red] = ["<:green_tick:1036290473708495028>", "<:red_tick:1036290475012915270>"]
                townEmbed.addFields(fn.embedField("Flags", `
                    ${town.pvp ? green : red } PVP
                    ${town.mobs ? green : red } Mobs 
                    ${town.public? green : red } Public
                    ${town.explosion ? green : red } Explosions 
                    ${town.fire ? green : red } Fire Spread`
                ))

                await m.edit({ 
                    embeds: [townEmbed], 
                    files: [fn.NOVA.thumbnail]
                })
            }
        })
    }
}