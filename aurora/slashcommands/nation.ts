import * as fn from '../../bot/utils/fn.js'
import * as database from "../../bot/utils/database.js"

import {
    type Client, 
    type TextChannel,
    type ChatInputCommandInteraction, 
    EmbedBuilder, SlashCommandBuilder, 
    Colors, ButtonStyle
} from "discord.js"

import { CustomEmbed, EntityType } from "../../bot/objects/CustomEmbed.js"
import News from "../../bot/objects/News.js"

import { Aurora, NotFoundError } from 'earthmc'

export default {
    name: "nation",
    description: "Displays info for a nation.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const nationEmbed = new CustomEmbed(client)
            .setColour(Colors.Aqua)
            .setTimestamp()

        const subCmd = interaction.options.getSubcommand()
        if (!subCmd) return await interaction.reply({ embeds: [new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("No Arguments Given")
            .setDescription("To see nation usage, type `/help` and locate 'Nation Commands'")
        ], ephemeral: true })

        await interaction.deferReply()

        const townsWithDuplicates = []
        const nationsWithoutDuplicates = []

        let nations = await database.Aurora.getNations()
        if (!nations) nations = await Aurora.Nations.all().catch(err => console.log(err))

        if (subCmd == "list") {
            let comparator = interaction.options.getString("comparator")

            if (comparator != null) {
                comparator = comparator.toLowerCase()

                if (comparator == "online") {         
                    const onlinePlayers = await Aurora.Players.online().catch(() => {})
                    if (!onlinePlayers) return await interaction.editReply({ embeds: [fn.fetchError] })
                        .then(() => setTimeout(() => interaction.deleteReply(), 10000)).catch(() => {})

                    let towns = await database.Aurora.getTowns()
                    if (!towns) towns = await Aurora.Towns.all()

                    const len = towns.length
                    for (let i = 0; i < len; i++) {
                        const cur = towns[i]
                        const nationName = cur.nation

                        if (nationName == "No Nation") continue
                        const townData = {
                            name: cur.name,
                            nation: nationName,
                            residents: cur.residents.length,
                            residentNames: cur.residents,
                            onlineResidents: [],
                            chunks: cur.area
                        }

                        townsWithDuplicates.push(townData)
                    }
                    
                    // Gets rid of duplicates and add up residents and chunks.
                    const temp: Record<string, any> = {}
                    townsWithDuplicates.forEach(town => {
                        if (!temp[town.nation]) {        
                            const onlineResidents = town.residentNames.filter(resident =>
                                onlinePlayers.find(op => resident === op.name || resident.includes(op.name)
                            ))
                            
                            temp[town.nation] = { 
                                nation: town.nation,
                                residentNames: town.residentNames,
                                onlineResidents: onlineResidents,
                                chunks: 0
                            }

                            nationsWithoutDuplicates.push(temp[town.nation])
                        }

                        // If it already exists, add up stuff.
                        temp[town.nation].chunks += town.chunks
                        temp[town.nation].residentNames = fn.removeDuplicates(temp[town.nation].residentNames.concat(town.residentNames))
                        temp[town.nation].onlineResidents = temp[town.nation].residentNames.filter(resident => 
                            onlinePlayers.find(op => resident === op.name || resident.includes(op.name)
                        ))                        
                    }, Object.create(null))

                    const allData = nationsWithoutDuplicates
                        .sort((a, b) => b.onlineResidents.length - a.onlineResidents.length)
                        .map(nation => nation.nation + " - " + nation.onlineResidents.length)                                     
                        .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    new CustomEmbed(client, `Nation Info | Online Residents`)
                        .setType(EntityType.Nation)
                        .paginate(allData, "```", "```")
                        .editInteraction(interaction)
                }
                else if (comparator == "residents") nations.sort((a, b) => b.residents.length - a.residents.length)  
                else if (comparator == "chunks" || comparator == "land" || comparator == "area") nations.sort((a, b) => b.area - a.area)
                else if (comparator == "alphabetical" || comparator == "name") {
                    fn.sortByOrder(nations, [{
                        key: 'name',
                        callback: k => k.toLowerCase()
                    }, {
                        key: 'residents',
                        callback: k => k.length
                    }, {
                        key: 'area'
                    }])
                }
                else nations = fn.defaultSort(nations)

                if (comparator != "online") {
                    const allData = nations
                        .map(nation => nation.name + " - Residents: " + nation.residents.length + " | Chunks: " + nation.area)
                        .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    new CustomEmbed(client, `Nation Info | Nation List`)
                        .setType(EntityType.Nation)
                        .paginate(allData, "```", "```")
                        .editInteraction(interaction)
                }
            }
            else { // /n list
                nations = fn.defaultSort(nations)
                
                const allData = nations
                    .map(nation => nation.name + " - Residents: " + nation.residents.length + " | Chunks: " + nation.area)
                    .join('\n').match(/(?:^.*$\n?){1,15}/mg)

                new CustomEmbed(client, `Nation Info | Nation List`)
                    .setType(EntityType.Nation)
                    .paginate(allData, "```", "```")
                    .editInteraction(interaction)
            }
        }
        else if (subCmd == "activity" && interaction.options.getString("name") != null) {
            const nation = nations.find(n => n.name.toLowerCase() == interaction.options.getString("name").toLowerCase())

            if (!nation) {
                nationEmbed.setTitle("Invalid Nation")
                nationEmbed.setDescription(interaction.options.getString("name") + " is not a valid nation, please try again.")
                nationEmbed.setColor(Colors.Red)

                return interaction.editReply({ embeds: [nationEmbed] })
            }

            const players = await database.getPlayers()
            if (!players) return await interaction.editReply({ embeds: [fn.databaseError] })
                .then(() => setTimeout(() => interaction.deleteReply(), 10000))

            // Sort by highest offline duration
            nation.residents.sort((a, b) => {
                const foundPlayerA = players.find(p => p.name == a)
                const foundPlayerB = players.find(p => p.name == b)

                if (foundPlayerA && !foundPlayerB) return -1
                if (!foundPlayerA && foundPlayerB) return 1

                if (foundPlayerA && foundPlayerB) {
                    const loA = foundPlayerA.lastOnline
                    const loB = foundPlayerB.lastOnline

                    // Identical? don't sort.
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

                if (residentInPlayers && residentInPlayers.lastOnline != null)
                    return "``" + resident + "`` - " + `<t:${fn.unixFromDate(residentInPlayers.lastOnline.aurora)}:R>`

                return "" + resident + " | Unknown"
            }).join('\n').match(/(?:^.*$\n?){1,10}/mg)

            new CustomEmbed(client, `Nation Info | Activity in ${nation.name}`)
                .setType(EntityType.Nation)
                .paginate(allData)
                .editInteraction(interaction)
        } // /n <nation>
        else if (subCmd == "lookup" && interaction.options.getString("name") != null) {
            const nation = nations.find(n => n.name.toLowerCase() == interaction.options.getString("name").toLowerCase())
            if (!nation) {
                nationEmbed.setTitle("Invalid Nation")
                nationEmbed.setDescription(interaction.options.getString("name") + " is not a valid nation, please try again.")
                nationEmbed.setColor(Colors.Red)

                return interaction.editReply({ embeds: [nationEmbed] })
            }
            
            const capitalColours = await Aurora.Towns.get(nation.capital.name).then((t: any) => {
                return t instanceof NotFoundError ? null : t.colourCodes
            })

            const colour = capitalColours ? parseInt(capitalColours.fill.replace('#', '0x')) : Colors.Aqua
            nationEmbed.setColor(colour)
            
            //#region Prefixes
            const nationResLength = nation.residents.length
            const nationLeaderPrefix = nationResLength >= 60 ? "God Emperor "
                : nationResLength >= 40 ? "Emperor "
                : nationResLength >= 30 ? "King "
                : nationResLength >= 20 ? "Duke "
                : nationResLength >= 10 ? "Count "
                : nationResLength >= 0 ? "Leader " : ""
            
            // Includes prefix
            const nationName = nationResLength >= 60 ? "The " + nation.name + " Realm"
                : nationResLength >= 40 ? "The " + nation.name + " Empire"
                : nationResLength >= 30 ? "Kingdom of " + nation.name
                : nationResLength >= 20 ? "Dominion of " + nation.name
                : nationResLength >= 10 ? "Federation of " + nation.name
                : "Land of " + nation.name
            //#endregion

            nations = fn.defaultSort(nations)

            const nationRank = (nations.findIndex(n => n.name == nation.name)) + 1
            const kingPrefix = nation.kingPrefix ? nation.kingPrefix + " " : nationLeaderPrefix

            //#region Embed Stuff
            const capitalX = nation.capital.x
            const capitalZ = nation.capital.z
            
            nationEmbed.setTitle("Nation Info | " + nationName + " | #" + nationRank)
                .setThumbnail(nation.flag ? nation.flag : 'attachment://aurora.png')
                .setFooter(fn.devsFooter(client))
                .addFields(
                    fn.embedField("King", kingPrefix + nation.king.replace(/_/g, "\\_"), true),
                    fn.embedField("Capital", nation.capital.name, true),
                    fn.embedField("Location", 
                        "[" + capitalX + ", " + capitalZ + "]" + 
                        "(https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=6&x=" + capitalX + "&y=64&z=" + capitalZ + ")"),
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
                    nation.residents.filter(resident => onlinePlayers.find(op => resident == op.name)))
                
                if (onlineNationResidents.length >= 1) nationEmbed.addFields(fn.embedField(
                    "Online Residents [" + onlineNationResidents.length + "]", 
                    "```" + onlineNationResidents.join(", ") + "```"
                ))
            }
            //#endregion

            //#region Recent news logic
            const newsChannel = client.channels.cache.get(fn.AURORA.newsChannel) as TextChannel
            const newsChannelMessages = await newsChannel?.messages.fetch()

            const filterNews = msg => msg.content.toLowerCase().includes(nation.name.replace(/_/g, " ").toLowerCase() || nation.name.toLowerCase())

            // Get news descriptions that include the nation name
            // Then sort/get most recent description
            const filteredMessages = newsChannelMessages?.filter(msg => filterNews(msg))
            const mostRecentDate = new Date(Math.max.apply(null, filteredMessages?.map(e => new Date(e.createdTimestamp))))

            const recentNews = filteredMessages?.find(e => { 
                const d = new Date(e.createdTimestamp)
                return d.getTime() == mostRecentDate.getTime()
            })
            //#endregion
            
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

            const alliances = await database.Aurora.getAlliances()
            if (alliances) {
                const nationAlliances = alliances
                    .filter(alliance => alliance.nations.map(e => e.toLowerCase())
                    .includes(nation.name.toLowerCase())).map(a => a.allianceName) 

                const len = nationAlliances?.length
                if (len > 0) nationEmbed.addFields(fn.embedField(
                    `Alliances [${len}]`, 
                    "```" + nationAlliances.join(", ") + "```"
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
            nationEmbed.editInteraction(interaction)
        }
    }, data: new SlashCommandBuilder()
        .setName("nation")
        .setDescription("Displays info for a nation.")
        .addSubcommand(subcommand => subcommand
                .setName('lookup')
                .setDescription('Get detailed information for a nation')
                .addStringOption(option => option.setName("name").setDescription("The name of the nation to lookup.").setRequired(true)))
        .addSubcommand(subcommand => subcommand
                .setName('activity')
                .setDescription('Gets activity data for members of a nation.')
                .addStringOption(option => option.setName("name").setDescription("The name of the nation to get activity data for.").setRequired(true)))
        .addSubcommand(subcommand => subcommand
                .setName('list')
                .setDescription('List nations using various comparators.')
                .addStringOption(option => option.setName("comparator").setDescription("The comparator to use. Available: online, residents, chunks & name.")))
}