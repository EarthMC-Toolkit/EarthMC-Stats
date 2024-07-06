import {
    type Client,
    type Message,
    type TextChannel,
    ButtonStyle,
    Colors,
    EmbedBuilder
} from "discord.js"

import { Aurora, type SquaremapTown } from "earthmc"
import { CustomEmbed, EntityType } from "../../bot/objects/CustomEmbed.js"

import News from "../../bot/objects/News.js"

import * as fn from '../../bot/utils/fn.js'
import * as database from "../../bot/utils/database.js"

export default {
    name: "nation",
    description: "Displays info for a nation.",
    slashCommand: true,
    aliases: ["n"],
    run: async (client: Client, message: Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching nation data, this might take a moment.")
            .setColor(Colors.Aqua)
        ]})
        
        if (!req) return await m.edit({embeds: [new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("No Arguments Given")
            .setDescription("To see nation usage, type `/help` and locate 'Nation Commands'")]
        }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const nationEmbed = new CustomEmbed(client)
            .setDefaultAuthor(message)
            .setTimestamp()
        
        let nations = await database.Aurora.getNations()
        if (!nations) nations = await Aurora.Nations.all()

        if (args[0].toLowerCase() == "list") {
            if (args[1] != null) {
                const townsWithDuplicates = []
                const nationsWithoutDuplicates = []

                if (args[1].toLowerCase() == "online") {         
                    const onlinePlayers = await Aurora.Players.online().catch(() => null)
                    if (!onlinePlayers) return await m.edit({ embeds: [fn.fetchError] })
                        .then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                    let towns = await database.Aurora.getTowns()
                    if (!towns) towns = await Aurora.Towns.all()

                    const len = towns.length
                    for (let i = 0; i < len; i++) {  
                        const cur = towns[i]
                        const nationName = cur.nation

                        if (nationName == "No Nation") continue
                        else townsWithDuplicates.push({
                            name: cur.name,
                            nation: nationName,
                            residents: cur.residents.length,
                            residentNames: cur.residents,
                            onlineResidents: [],
                            chunks: cur.area
                        })
                    }
                    
                    // Function to get rid of duplicates and add up residents and chunks.
                    townsWithDuplicates.forEach(function(town) {                             
                        if (!this[town.nation]) {        
                            const onlineResidents = town.residentNames.filter(resident => 
                                onlinePlayers.find(op => resident === op.name || resident.includes(op.name)
                            ))
                            
                            this[town.nation] = { 
                                nation: town.nation,
                                residentNames: town.residentNames,
                                onlineResidents: onlineResidents,
                                chunks: 0
                            }  

                            nationsWithoutDuplicates.push(this[town.nation])
                        }

                        // If it already exists, add up stuff.
                        this[town.nation].residentNames = fn.removeDuplicates(this[town.nation].residentNames.concat(town.residentNames))
                        this[town.nation].onlineResidents = this[town.nation].residentNames.filter(resident => 
                            onlinePlayers.find(op => resident === op.name || resident.includes(op.name)
                        ))
                            
                        this[town.nation].chunks += town.chunks                            
                    }, Object.create(null))

                    let page = 1
                    const split = req.split(" ")

                    if (args[2]) if (split[2]) page = parseInt(split[2])
                    else if (split[1]) page = parseInt(split[1])

                    if (isNaN(page)) page = 0        
                    else page--

                    nationsWithoutDuplicates.sort((a, b) => b.onlineResidents.length - a.onlineResidents.length)

                    const allData = nationsWithoutDuplicates
                        .map(nation => nation.nation + " - " + nation.onlineResidents.length)
                        .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    new CustomEmbed(client, `(Aurora) Nation Info | Online Residents`)
                        .setType(EntityType.Nation)
                        .setPage(page)
                        .setDefaultAuthor(message)
                        .paginate(allData, "```", "```")
                        .editMessage(m)
                }
                else if (args[1].toLowerCase() == "residents") {            
                    nations.sort((a, b) => b.residents.length - a.residents.length)
                }
                else if (args[1].toLowerCase() == "chunks" || args[1].toLowerCase() == "land" || args[1].toLowerCase() == "area") {
                    nations.sort((a, b) => b.area - a.area)
                }
                else if (args[1].toLowerCase() == "alphabetical" || args[1].toLowerCase() == "name") {
                    nations.sort((a, b) => {
                        if (b.name.toLowerCase() < a.name.toLowerCase()) return 1
                        if (b.name.toLowerCase() > a.name.toLowerCase()) return -1

                        if (b.residents.length > a.residents.length) return 1
                        if (b.residents.length < a.residents.length) return -1

                        if (b.area > a.area) return 1
                        if (b.area < a.area) return -1

                        return 0
                    })
                }
                else nations = fn.defaultSort(nations)

                if (args[1].toLowerCase() != "online") {
                    let page = 1

                    if (args[2] != null) if (req.split(" ")[2]) page = parseInt(req.split(" ")[2])
                    else if (req.split(" ")[1]) page = parseInt(req.split(" ")[1]) 

                    if (isNaN(page)) page = 0        
                    else page--

                    const allData = nations
                        .map(nation => nation.name + " - Residents: " + nation.residents.length + " | Chunks: " + nation.area)
                        .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    new CustomEmbed(client, `(Aurora) Nation Info | Nation List`)
                        .setDefaultAuthor(message)
                        .setType(EntityType.Nation).setPage(page)
                        .paginate(allData, "```", "```")
                        .editMessage(m)
                }
            }
            else { // /n list
                nations = fn.defaultSort(nations)
                
                let page = 1

                if (args[2] != null) if (req.split(" ")[2]) page = parseInt(req.split(" ")[2]) 
                else if (req.split(" ")[1]) page = parseInt(req.split(" ")[1])

                if (isNaN(page)) page = 0        
                else page--

                const allData = nations
                    .map(nation => nation.name + " - Residents: " + nation.residents.length + " | Chunks: " + nation.area)
                    .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                new CustomEmbed(client, `(Aurora) Nation Info | Nation List`)
                    .setDefaultAuthor(message)
                    .setType(EntityType.Nation).setPage(page)
                    .paginate(allData, "```", "```")
                    .editMessage(m)
            }
        }
        else if (args[0].toLowerCase() == "activity" && args[1] != null) {
            const nation = nations.find(n => n.name.toLowerCase() == args[1].toLowerCase())

            if (!nation) {
                nationEmbed.setTitle("Invalid Nation")
                    .setDescription(args[0] + " is not a valid nation, please try again.")
                    .setColor(Colors.Red)

                return m.edit({ embeds: [nationEmbed] }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }

            database.getPlayers().then(async players => {
                // Sort by highest offline duration
                nation.residents.sort((a, b) => {
                    const foundPlayerA = players.find(p => p.name == a)
                    const foundPlayerB = players.find(p => p.name == b)

                    if (foundPlayerA && !foundPlayerB) return -1
                    if (!foundPlayerA && foundPlayerB) return 1

                    if (foundPlayerA && foundPlayerB) {
                        const loA = foundPlayerA.lastOnline
                        const loB = foundPlayerB.lastOnline
                        
                        if (loA.aurora === loB.aurora) return 0
                        if (!loA) return 1
                        if (!loB) return -1

                        const dateB = fn.unixFromDate(loB.aurora)
                        const dateA = fn.unixFromDate(loA.aurora)

                        return dateB - dateA
                    }
                })

                let page = 1
                if (isNaN(page)) page = 0
                else page--

                const allData = nation.residents.map(resident => {
                    const residentInPlayers = players.find(p => p.name == resident)
                    const lo = residentInPlayers.lastOnline

                    return residentInPlayers && lo 
                        ? "``" + resident + "`` - " + `<t:${fn.unixFromDate(lo.aurora)}:R>`
                        : "" + resident + " | Unknown"
                }).join('\n').match(/(?:^.*$\n?){1,10}/mg)

                new CustomEmbed(client, `(Aurora) Nation Info | Activity in ${nation.name}`)
                    .setDefaultAuthor(message)
                    .setType(EntityType.Nation).setPage(page)
                    .paginate(allData)
                    .editMessage(m)
            }).catch(() => {})
        }
        else if (args[0].toLowerCase() == "invitable") {
            const nation = nations.find(n => n.name.toLowerCase() == args[1].toLowerCase())
            if (!nation) {
                nationEmbed.setTitle("Invalid Nation")
                    .setDescription(args[0] + " is not a valid nation, please try again.")
                    .setColor(Colors.Red)

                return m.edit({ embeds: [nationEmbed] }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }

            let page = 1
            if (isNaN(page)) page = 0
            else page--

            // TODO: Fix invitableTowns returning FetchError instead of throwing.
            const invitableTowns = await Aurora.Towns.invitable(nation.name) as any[]
            const allData = invitableTowns.map(t => t.name).join('\n').match(/(?:^.*$\n?){1,10}/mg)                

            new CustomEmbed(client, `(Aurora) Nation Info | Towns invitable to ${nation.name}`)
                .setDefaultAuthor(message)
                .setType(EntityType.Nation).setPage(page)
                .paginate(allData, "```", "```")
                .editMessage(m)
        }
        else if (args[0].toLowerCase() == "allies") {
            database.Aurora.getAlliances().then(async alliances => {
                if (!alliances) return await m.edit({embeds: [fn.databaseError]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                const nation = nations.find(n => n.name.toLowerCase() == args[1].toLowerCase())
                if (!nation) {
                    nationEmbed.setTitle("Invalid Nation")
                        .setDescription(args[1] + " is not a valid nation, please try again.")
                        .setColor(Colors.Red)
                
                    return m.edit({ embeds: [nationEmbed] }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                }

                const alliancesWithNation = alliances.filter(a => a.nations.includes(nation.name)),
                        allies = []

                // If the nation is in one or more alliances.
                if (alliancesWithNation.length > 0) {
                    alliancesWithNation.forEach(a => { 
                        a.nations.forEach(n => { 
                            if (!allies.includes(n) && n != nation.name) allies.push(n) 
                        }) 
                    })
                } else {
                    nationEmbed.setTitle("Unable to fetch allies")
                        .setDescription(args[1] + " is not in any alliances.")
                        .setColor(Colors.Red)

                    return m.edit({ embeds: [nationEmbed] })
                        .then(m => setTimeout(() => m.delete(), 10000))
                        .catch(() => {})
                }

                let page = 1
                if (isNaN(page)) page = 0        
                else page--

                const allData = allies.join('\n').match(/(?:^.*$\n?){1,10}/mg)
                new CustomEmbed(client, `(Aurora) Nation Info | ${nation.name} Allies`)
                    .setDefaultAuthor(message)
                    .setType(EntityType.Nation)
                    .setPage(page)
                    .paginate(allData, "```", "```")
                    .editMessage(m)
            }).catch(() => {})
        }
        else { // /n <nation>
            const nation = nations.find(n => n.name.toLowerCase() == args[0].toLowerCase())
            if (!nation) {
                nationEmbed.setTitle("Invalid Nation")
                    .setDescription(args[0] + " is not a valid nation, please try again.")
                    .setColor(Colors.Red)

                return m.edit({ embeds: [nationEmbed] })
                    .then(m => setTimeout(() => m.delete(), 10000))
                    .catch(() => {})
            }

            const capitalColours = await Aurora.Towns.get(nation.capital.name)
                .then((t: SquaremapTown) => t.colours).catch(() => {})

            const colour = capitalColours ? parseInt(capitalColours.fill.replace('#', '0x')) : Colors.Aqua
            nationEmbed.setColor(colour)
            
            //#region Prefixes
            const nationResLength = nation.residents.length
            const nationLeaderPrefix = nationResLength >= 60 ? "God Emperor "
                : nationResLength >= 40 ? "Emperor " 
                : nationResLength >= 30 ? "King "
                : nationResLength >= 20 ? "Duke "
                : nationResLength >= 10 ? "Count "
                : nationResLength >= 0  ? "Leader " : ""
            
            // Includes prefix
            const nationName = nationResLength >= 60 ? "The " + nation.name + " Realm" 
                : nationResLength >= 40 ? "The " + nation.name + " Empire"
                : nationResLength >= 30 ? "Kingdom of " + nation.name 
                : nationResLength >= 20 ? "Dominion of " + nation.name 
                : nationResLength >= 10 ? "Federation of " + nation.name : "Land of " + nation.name
            //#endregion

            nations = fn.defaultSort(nations)

            const nationRank = (nations.findIndex(n => n.name == nation.name)) + 1,
                    kingPrefix = nation.kingPrefix ? nation.kingPrefix + " " : nationLeaderPrefix

            //#region Embed Stuff
            nationEmbed.setTitle("Nation Info | " + nationName + " | #" + nationRank)
                .setThumbnail(nation.flag ? nation.flag : 'attachment://aurora.png')
                .addFields(
                    fn.embedField("King", kingPrefix + nation.king.replace(/_/g, "\\_"), true),
                    fn.embedField("Capital", nation.capital.name, true),
                    fn.embedField("Location", 
                        "[" + nation.capital.x + ", " + nation.capital.z + "]" + 
                        "(https://map.earthmc.net?worldname=earth&mapname=flat&zoom=6&x=" + 
                        nation.capital.x + "&y=64&z=" + nation.capital.z + ")"
                    ),
                    fn.embedField("Chunks", nation.area.toString(), true),
                    fn.embedField("Residents", nationResLength.toString(), true),
                    fn.embedField("Nation Bonus", fn.auroraNationBonus(nationResLength).toString())
                )

            if (nation.discord) 
                nationEmbed.setURL(nation.discord)

            const onlinePlayers = await Aurora.Players.online().catch(() => {})
            if (onlinePlayers) {
                // Filter nation residents by which are online
                const onlineNationResidents = fn.removeDuplicates(
                    nation.residents.filter(resident => onlinePlayers.find(op => resident == op.name)
                ))

                const onlineNationResidentsLen = onlineNationResidents.length
                if (onlineNationResidentsLen >= 1) nationEmbed.addFields(fn.embedField(
                    `Online Residents [${onlineNationResidentsLen}]`, 
                    "```" + onlineNationResidents.join(", ") + "```"
                ))
            }
            //#endregion

            //#region Recent news logic
            const newsChannel = client.channels.cache.get(fn.AURORA.newsChannel) as TextChannel
            const newsChannelMessages = await newsChannel?.messages.fetch()

            const filterNews = msg => msg.content.toLowerCase().includes(nation.name.replace(/_/g, " ").toLowerCase() || nation.name.toLowerCase())

            // Get news descriptions that include the nation name, then sort by most recent.
            const filteredMessages = newsChannelMessages?.filter(msg => filterNews(msg))
            const mostRecentDate = new Date(Math.max.apply(null, filteredMessages?.map(e => new Date(e.createdTimestamp))))

            const recentNews = filteredMessages?.find(e => { 
                const d = new Date(e.createdTimestamp)
                return d.getTime() == mostRecentDate.getTime()
            })
            //#endregion

            const alliances = await database.Aurora.getAlliances()
            if (alliances) {
                const nationAlliances = alliances
                    .filter(alliance => alliance.nations.map(e => e.toLowerCase())                            
                    .includes(nation.name.toLowerCase()))
                    .map(a => a.allianceName)

                const len = nationAlliances.length
                if (len > 0) nationEmbed.addFields(fn.embedField(
                    `Alliances [${len}]`, 
                    "```" + nationAlliances.join(", ") + "```"
                ))
            }

            const nationTowns = nation.towns.join(", ")
            const nationTownsString = nationTowns.toString().replace(/^\s+|\s+$/gm, "")
            
            if (nationTownsString.length >= 1024) {
                nationEmbed.addFields(fn.embedField(
                    `Towns [${nation.towns.length}]`, 
                    "Too many towns to display!\nClick the **View All Towns** button to see the full list."
                ))
                
                nationEmbed.addButton('view_all_towns', 'View All Towns', ButtonStyle.Primary)
            } else {                   
                nationEmbed.addFields(fn.embedField(
                    `Towns [${nation.towns.length}]`, 
                    "```" + nationTownsString + "```"
                ))
            }
            
            if (recentNews) {
                const news = new News(recentNews)
                const img = news?.images[0]

                nationEmbed.addFields(fn.embedField(
                    "Recent News",
                    news.message + (img ? " ([Image](" + img + "))" : "")
                ))
            }

            const thumbnail = nation.flag ? [] : [fn.AURORA.thumbnail]
            
            nationEmbed.setFiles(thumbnail)
            nationEmbed.editMessage(m)
        }
    }
}

