import * as fn from '../../bot/utils/fn.js'
import * as database from "../../bot/utils/database.js"

import { CustomEmbed, EntityType } from "../../bot/objects/CustomEmbed.js"
import { Aurora, NotFoundError, formatString } from "earthmc"

import { 
    type Client, 
    type Message, 
    EmbedBuilder, Colors
} from "discord.js"

export default {
    name: "town",
    description: "Displays info for a town.",
    slashCommand: true,
    aliases: ["t"],
    run: async (client: Client, message: Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching town data, this might take a moment.")
            .setColor(Colors.Green)]})

        if (!req) return await m.edit({embeds: [new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("Command Usage")
            .setDescription("`/town <name>`\n`/town list`")
        ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
        
        database.Aurora.getTowns().then(async towns => {
            if (!towns) towns = await Aurora.Towns.all().then(arr => arr.map(t => {
                t.name = formatString(t.name, false)
                return t
            })).catch(err => console.log(err))

            const townEmbed = new EmbedBuilder()

            let onlineResidents = []
            let claimBonus = 0

            const opt = args[0]
            const arg1 = args[1]?.toLowerCase()

            if (opt.toLowerCase() == "list") {
                if (!arg1) return

                if (arg1 == "online") {
                    const onlinePlayers = await Aurora.Players.online().catch(() => {})
                    if (!onlinePlayers) {
                        return await m.edit({ embeds: [fn.fetchError] })
                            .then((m => setTimeout(() => m.delete(), 10000)))
                            .catch(() => {})
                    }

                    const onlineTownData = []
                    const onlineTownDataFinal = []

                    const len = towns.length
                    for (let i = 0; i < len; i++) {        
                        const cur = towns[i]
                        
                        onlineTownData.push({
                            name: cur.name,
                            nation: cur.nation,
                            residentNames: cur.residents,
                            onlineResidents: [],
                            onlineResidentAmount: 0
                        }) 
                    }

                    // Function to get rid of duplicates and add up residents and chunks.
                    onlineTownData.forEach(function (a) {                   
                        // If town doesnt exist, add it.
                        if (!this[a.name]) {           
                            a.onlineResidents = a.residentNames.filter(resident => onlinePlayers.find(op => resident === op.name))

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

                    if (args[2] != null) if (req.split(" ")[2]) page = parseInt(req.split(" ")[2])
                    else if (req.split(" ")[1]) page = parseInt(req.split(" ")[1])

                    if (isNaN(page)) page = 0
                    else page--

                    onlineTownDataFinal.sort((a, b) => b.onlineResidentAmount - a.onlineResidentAmount)

                    const allData = onlineTownDataFinal
                        .map(town => `${town.name} (${town.nation}) - ${town.onlineResidentAmount}`)
                        .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    new CustomEmbed(client, "Town Info | Online Resident List")
                        .setType(EntityType.Town)
                        .setPage(page)
                        .paginate(allData, "```", "```")
                        .editMessage(m)
                }
                else if (arg1 == "residents") {          
                    towns.sort((a, b) => b.residents.length - a.residents.length)           
                }
                else if (arg1 == "chunks" || arg1 == "land" || arg1 == "area") {
                    towns.sort((a, b) => b.area - a.area)
                }
                else if (arg1 == "name" || arg1 == "alphabetical") {
                    fn.sortByOrder(towns, [
                        { key: 'name', callback: (n: string) => n.toLowerCase() },
                        { key: 'residents', callback: (arr: string) => arr.length },
                        { key: 'area' }
                    ])
                }
                else { // /t list <nation>
                    const foundNation = towns.find(town => town.nation.toLowerCase() == arg1)
                    
                    if (!foundNation) towns = fn.defaultSort(towns)
                    else {
                        // Set towns array to the filtered array (only towns that are in the specified nation)
                        towns = towns.filter(town => town.nation.toLowerCase() == arg1)
                        const arg2 = args[2]?.toLowerCase()

                        if (!arg2) towns = fn.defaultSort(towns)
                        else {
                            if (arg2 == "area" || arg2 == "chunks") {
                                towns.sort((a, b) => {
                                    if (b.area > a.area) return 1
                                    if (b.area < a.area) return -1
                                })
                            }
                            else if (arg2 == "residents") {
                                towns.sort((a, b) => {
                                    if (b.residents.length > a.residents.length) return 1
                                    if (b.residents.length < a.residents.length) return -1
                                })
                            }
                            else if (arg2 == "alphabetical" || arg2 == "name") {
                                towns.sort((a, b) => {
                                    if (b.name.toLowerCase() < a.name.toLowerCase()) return 1
                                    if (b.name.toLowerCase() > a.name.toLowerCase()) return -1
                                })
                            }
                        }
                    }
                }

                sendList(client, m, arg1, towns)
            }
            else if (opt.toLowerCase() == "activity" && arg1) {
                const town = towns.find(t => t.name.toLowerCase() == arg1)

                if (!town) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Invalid town name!")
                    .setDescription(args[1] + " doesn't seem to be a valid town name, please try again.")
                    .setTimestamp().setColor(Colors.Red)
                ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                const players = await database.getPlayers().catch(() => {})
                if (!players) return await m.edit({ embeds: [fn.databaseError] })
                    .then((m => setTimeout(() => m.delete(), 10000)))
                    .catch(() => {})

                // Sort by highest offline duration
                town.residents.sort((a, b) => {
                    const foundPlayerA = players.find(p => p.name == a)
                    const foundPlayerB = players.find(p => p.name == b)

                    if (foundPlayerA && !foundPlayerB) return -1
                    if (!foundPlayerA && foundPlayerB) return 1

                    if (foundPlayerA && foundPlayerB) {
                        // Identical, do nothing.
                        if (foundPlayerA.lastOnline === foundPlayerB.lastOnline.aurora) return 0 

                        if (foundPlayerA.lastOnline === null) return 1
                        if (foundPlayerB.lastOnline === null) return -1

                        const dateB = fn.unixFromDate(foundPlayerB.lastOnline.aurora)
                        const dateA = fn.unixFromDate(foundPlayerA.lastOnline.aurora)

                        return dateB - dateA
                    }
                })

                let page = 1
                if (isNaN(page)) page = 0
                else page--

                const allData = town.residents.map(resident => {
                    const residentInPlayers = players.find(p => p.name == resident)

                    if (residentInPlayers && residentInPlayers.lastOnline != null) 
                        return "``" + resident + "`` - " + `<t:${fn.unixFromDate(residentInPlayers.lastOnline.aurora)}:R>`

                    return "" + resident + " | Unknown"
                }).join('\n').match(/(?:^.*$\n?){1,10}/mg)

                const townColours = await Aurora.Towns.get(town.name).then((t: any) => {
                    return t instanceof NotFoundError ? null : t.colourCodes
                })
                
                const colour = !townColours ? Colors.Green : parseInt(townColours.fill.replace('#', '0x'))
                new CustomEmbed(client, "Town Info | Activity in " + town.name)
                    .setColor(colour)
                    .setType(EntityType.Town)
                    .setPage(page)
                    .paginate(allData)
                    .editMessage(m)
            }
            else if (args.length > 3 || args.length == null || opt == null) {
                return await m.edit({embeds: [new EmbedBuilder()
                    .setDescription("Invalid arguments! Usage: `/t townName` or `/t list`")
                    .setFooter(fn.devsFooter(client))
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp()
                    .setColor(Colors.Red)
                ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
            }
            else { // /t <town>
                const town = towns.find(t => t.name.toLowerCase() == opt.toLowerCase())

                if (!town) return m.edit({embeds: [
                    new EmbedBuilder()
                    .setTitle("Invalid town name!")
                    .setDescription(opt + " doesn't seem to be a valid town name, please try again.")
                    .setTimestamp().setColor(Colors.Red)
                ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                towns = fn.defaultSort(towns)

                const townName = town.name
                const townRank = (towns.findIndex(t => t.name == townName)) + 1
                const mayor = town.mayor.replace(/_/g, "\\_")
                
                const townColours = await Aurora.Towns.get(town.name).then((t: any) => {
                    return t instanceof NotFoundError ? null : t.colourCodes
                })

                const colour = !townColours ? Colors.Green : parseInt(townColours.fill.replace('#', '0x'))
                townEmbed.setColor(town.ruined ? Colors.Orange : colour)
                         .setTitle(("Town Info | " + townName + `${town.capital ? " :star:" : ""}`) + (town.ruined ? " (Ruin)" : " | #" + townRank))
                         .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                
                const townNation = await database.Aurora.getNation(town.nation) ?? await Aurora.Nations.get(town.nation),
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
                            : nationResidentsLength >= 0 ? "Leader " : ""}` + mayor, true))
                    } else {
                        townEmbed.addFields(fn.embedField("Mayor", 
                            `${townResidentsLength >= 28 ? "Lord "
                            : townResidentsLength >= 24 ? "Duke "
                            : townResidentsLength >= 20 ? "Earl "
                            : townResidentsLength >= 14 ? "Count "
                            : townResidentsLength >= 10 ? "Viscount "
                            : townResidentsLength >= 6 ? "Baron "
                            : townResidentsLength >= 2 ? "Chief "
                            : townResidentsLength == 1 ? "Hermit " : "" }` +  mayor, true)  ) 
                    }

                    const discord = townNation?.discord
                    const nationString = !discord ? town.nation : `[${townNation.name}](${townNation.discord})`

                    townEmbed.addFields(fn.embedField("Nation", nationString, true))
                }

                const multiplier = town.residents.length * 12
                if (town.nation != "No Nation") {
                    const nationBonus = fn.auroraNationBonus(townNation?.residents.length ?? 0)
                    claimBonus = nationBonus + multiplier
                    townEmbed.addFields(fn.embedField(
                        "Town Size", 
                        `${town.area} / ${Math.min(claimBonus, fn.maxTownSize)} [NationBonus: ${nationBonus}]`
                    ))
                }
                else {
                    townEmbed.addFields(fn.embedField("Town Size", `${town.area} / ${Math.min(multiplier, fn.maxTownSize)}`))
                }

                townEmbed.setTimestamp()
                    .setFooter(fn.devsFooter(client))
                    .setThumbnail('attachment://aurora.png')
                    .addFields(fn.embedField("Location", 
                        `[${town.x}, ${town.z}](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=6&x=${town.x}&y=64&z=${town.z})`, 
                        true
                    ))

                if (!town.ruined) {
                    // RESIDENTS
                    if (townResidentsLength > 0) {
                        if (townResidentsLength <= 50) {
                            townEmbed.addFields(fn.embedField(
                                `Residents [${townResidentsLength}]`, 
                                "```" + town.residents.join(", ") + "```"
                            ))    
                        }  
                        else townEmbed.addFields(fn.embedField("Residents", townResidentsLength.toString()))
                    } 
                    else townEmbed.addFields(fn.embedField("Residents", "There are no residents in this town?"))

                    // ONLINE RESIDENTS
                    const townyData = await database.Aurora.getOnlinePlayerData() as any

                    if (!townyData) {
                        townEmbed.addFields(fn.embedField(
                            "Online Residents", 
                            "No residents are online in " + town.name
                        ))
                    }
                    else {
                        onlineResidents = fn.removeDuplicates(town.residents.filter(resident => townyData.players.find(op => resident === op.account)))
                        const onlineResidentsString = onlineResidents.toString().replace(/,/g, ", ")

                        if (onlineResidents.length > 0) { 
                            townEmbed.addFields(fn.embedField(
                                `Online Residents [${onlineResidents.length}]`, 
                                "```" + onlineResidentsString + "```"
                            ))
                        }
                        else townEmbed.addFields(fn.embedField("Online Residents", `No residents are online in ${town.name}`))
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

                m.edit({ embeds: [townEmbed], files: [fn.AURORA.thumbnail] })
            }
        })
    }
}

function extractTownData(towns: any[]) {
    if (!towns) return []

    const townData = []
    const len = towns.length

    for (let i = 0; i < len; i++) {     
        const cur = towns[i]

        townData.push({
            name: cur.name,
            nation: cur.nation,
            residentNames: cur.residents,
            area: cur.area
        }) 
    }

    return townData
}

async function sendList(client: Client, msg: Message, comparator: string, towns: any[]) {
    towns = fn.defaultSort(towns)
    
    const townData = extractTownData(towns)
    const allData = townData.map((town, index) => (index + 1) + ". **" + town.name + " (" + town.nation + ")**\n" + 
        "```Residents: " + town.residentNames.length + 
        "``````Chunks: " + town.area + "```").join('\n').match(/(?:^.*$\n?){1,8}/mg)

    const embed = new CustomEmbed(client, "Town Info | Town List")
        .setType(EntityType.Town)
        .setPage(comparator ? parseInt(comparator) : 0)
        .paginate(allData, "\n")

    await embed.editMessage(msg)
}
