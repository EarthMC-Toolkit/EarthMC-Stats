import * as database from "../../bot/utils/database.js"

import { 
    AURORA,
    auroraNationBonus, embedField,
    databaseError, fetchError,
    defaultSort, devsFooter, 
    fastMergeUnique, removeDuplicates, 
    sortByOrder, unixFromDate,
    backtick
} from '../../bot/utils/fn.js'

import {
    type Client, 
    type TextChannel,
    type ChatInputCommandInteraction, 
    EmbedBuilder, SlashCommandBuilder, 
    Colors, ButtonStyle,
    type Message
} from "discord.js"

import { CustomEmbed, EntityType } from "../../bot/objects/CustomEmbed.js"
import News from "../../bot/objects/News.js"

import type { SquaremapTown } from 'earthmc'
import { Aurora, NotFoundError } from 'earthmc'

import type { DBSquaremapNation, NationItem, TownItem } from '../../bot/types.js'

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

        let nations = await database.Aurora.getNations()

        // TODO: Should probably handle this error case
        if (!nations) nations = await Aurora.Nations.all() as DBSquaremapNation[]

        if (subCmd == "list") {
            let comparator = interaction.options.getString("comparator")

            if (comparator != null) {
                const townsWithDuplicates: TownItem[] = []
                const nationsWithoutDuplicates: NationItem[] = []

                comparator = comparator.toLowerCase()

                if (comparator == "online") {         
                    const onlinePlayers = await Aurora.Players.online().catch(() => {})
                    if (!onlinePlayers) return await interaction.editReply({ embeds: [fetchError] })
                        .then(() => setTimeout(() => interaction.deleteReply(), 10000)).catch(() => {})

                    let towns = await database.Aurora.getTowns()
                    if (!towns) towns = await Aurora.Towns.all()

                    const len = towns.length
                    for (let i = 0; i < len; i++) {
                        const cur = towns[i]
                        const nationName = cur.nation

                        if (nationName == "No Nation") continue
                        townsWithDuplicates.push({
                            name: cur.name,
                            nation: nationName,
                            residents: cur.residents,
                            onlineResidents: [],
                            chunks: cur.area
                        })
                    }
                    
                    // Gets rid of duplicates and adds up residents and chunks.
                    const ctx: Record<string, NationItem> = {}
                    townsWithDuplicates.forEach(town => {
                        if (!ctx[town.nation]) {        
                            const onlineResidents = town.residents.filter(resident =>
                                onlinePlayers.some(op => resident === op.name || resident.includes(op.name)
                            ))
                            
                            ctx[town.nation] = { 
                                name: town.nation,
                                residents: town.residents,
                                onlineResidents: onlineResidents,
                                chunks: 0
                            }

                            nationsWithoutDuplicates.push(ctx[town.nation])
                        }

                        // If it already exists, add up stuff.
                        ctx[town.nation].chunks += town.chunks
                        ctx[town.nation].residents = fastMergeUnique(ctx[town.nation].residents, town.residents)
                        ctx[town.nation].onlineResidents = ctx[town.nation].residents.filter(resident => 
                            onlinePlayers.some(op => resident === op.name || resident.includes(op.name)
                        ))
                    })

                    const allData = nationsWithoutDuplicates
                        .sort((a, b) => b.onlineResidents.length - a.onlineResidents.length)
                        .map(nation => nation.name + " - " + nation.onlineResidents.length)                                     
                        .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    return new CustomEmbed(client, `List of Nations | Online Residents`)
                        .setType(EntityType.Nation)
                        .paginate(allData, "```", "```")
                        .editInteraction(interaction)
                }
                else if (comparator == "residents") nations.sort((a, b) => b.residents.length - a.residents.length)  
                else if (comparator == "chunks" || comparator == "land" || comparator == "area") nations.sort((a, b) => b.area - a.area)
                else if (comparator == "alphabetical" || comparator == "name") {
                    sortByOrder(nations, [{
                        key: 'name',
                        callback: (k: string) => k.toLowerCase()
                    }, {
                        key: 'residents',
                        callback: (k: string[]) => k.length
                    }, {
                        key: 'area'
                    }])
                }
                else nations = defaultSort(nations)

                if (comparator != "online") {
                    const allData = nations
                        .map(nation => nation.name + " - Residents: " + nation.residents.length + " | Chunks: " + nation.area)
                        .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    return new CustomEmbed(client, `List of Nations`)
                        .setType(EntityType.Nation)
                        .paginate(allData, "```", "```")
                        .editInteraction(interaction)
                }
            }
            else { // /n list
                nations = defaultSort(nations)
                
                const allData = nations
                    .map(nation => nation.name + " - Residents: " + nation.residents.length + " | Chunks: " + nation.area)
                    .join('\n').match(/(?:^.*$\n?){1,15}/mg)

                return new CustomEmbed(client, `List of Nations`)
                    .setType(EntityType.Nation)
                    .paginate(allData, "```", "```")
                    .editInteraction(interaction)
            }
        } else {
            const nameArg = interaction.options.getString("name", true)
            const nation = nations.find(n => n.name.toLowerCase() == nameArg.toLowerCase())
            if (!nation) {
                nationEmbed.setTitle("Invalid Nation!")
                nationEmbed.setDescription(`No nation with name \`${nameArg}\` exists.`)
                nationEmbed.setColor(Colors.Red)

                return interaction.editReply({ embeds: [nationEmbed] })
            }

            if (subCmd == "activity") {
                const players = await database.getPlayers()
                if (!players) return await interaction.editReply({ embeds: [databaseError] })
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
    
                        const dateB = unixFromDate(loB.aurora)
                        const dateA = unixFromDate(loA.aurora)
    
                        return dateB - dateA
                    }
                })
    
                let page = 1
                if (isNaN(page)) page = 0
                else page--
    
                const allData = nation.residents.map(resident => {
                    const residentInPlayers = players.find(p => p.name == resident)
    
                    let date: number | null = null
                    if (residentInPlayers && residentInPlayers.lastOnline?.aurora != null) {
                        date = unixFromDate(residentInPlayers.lastOnline.aurora)
                    }
    
                    return `**$${resident}** - ${date ? `<t:${date}:R>` : `Unknown`}`
                }).join('\n').match(/(?:^.*$\n?){1,10}/mg)
    
                return new CustomEmbed(client, `Nation Info | Activity in ${backtick(nation.name)}`)
                    .setType(EntityType.Nation)
                    .paginate(allData)
                    .editInteraction(interaction)
            }

            // /n <nation>
            if (subCmd == "lookup") {
                const capitalColours = await Aurora.Towns.get(nation.capital.name).then((t: SquaremapTown) => {
                    return t instanceof NotFoundError ? null : t.colours
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
                const nationLabel = nationResLength >= 60 ? "The " + nation.name + " Realm"
                    : nationResLength >= 40 ? "The " + nation.name + " Empire"
                    : nationResLength >= 30 ? "Kingdom of " + nation.name
                    : nationResLength >= 20 ? "Dominion of " + nation.name
                    : nationResLength >= 10 ? "Federation of " + nation.name
                    : "Land of " + nation.name
                //#endregion
    
                nations = defaultSort(nations)
    
                const nationRank = (nations.findIndex(n => n.name == nation.name)) + 1
                const kingPrefix = nation.kingPrefix ? nation.kingPrefix + " " : nationLeaderPrefix
    
                //#region Embed Stuff
                const [capitalX, capitalZ] = [nation.capital.x, nation.capital.z]
                const mapUrl = Aurora.buildMapLink({ x: capitalX, z: capitalZ }, 5)

                //const nationName = nation.wiki ? `[${nationLabel}](${nation.wiki})` : backtick(nationLabel)
                
                const area = Math.round(nation.area)
                const chunksStr = `<:chunk:1318944677562679398> \`${area.toString()}\` Chunks`

                // TODO: Implement as `/nation worth <nation` instead.
                //const worth = Math.round(nation.area * 16)
                //const goldStr = `<:gold:1318944918118600764> \`${worth}\`G`

                nationEmbed.setTitle(`Nation Info | ${backtick(nationLabel)} | #${nationRank}`)
                    .setThumbnail(nation.flag || 'attachment://aurora.png')
                    .setFooter(devsFooter(client))
                    .addFields(
                        embedField("King", backtick(nation.king, { prefix: kingPrefix }), true),
                        embedField("Capital", backtick(nation.capital.name), true), 
                        embedField("Location", `[${capitalX}, ${capitalZ}](${mapUrl.toString()})`, true),
                        embedField("Size", chunksStr, true),
                        embedField("Residents", `\`${nationResLength.toString()}\``, true),
                        embedField("Bonus Grant", `\`${auroraNationBonus(nationResLength).toString()}\``, true)
                    )
    
                if (nation.discord) 
                    nationEmbed.setURL(nation.discord)
    
                const ops = await Aurora.Players.online().catch(() => {})
                if (ops) {
                    // Filter nation residents by which are online
                    const onlineNationResidents = removeDuplicates(nation.residents.filter(res => ops.find(op => res == op.name)))
                    
                    if (onlineNationResidents.length >= 1) nationEmbed.addFields(embedField(
                        "Online Residents [" + onlineNationResidents.length + "]", 
                        "```" + onlineNationResidents.join(", ") + "```"
                    ))
                }
                //#endregion
    
                //#region Recent news logic
                const newsChannel = client.channels.cache.get(AURORA.newsChannel) as TextChannel
                const newsChannelMessages = await newsChannel?.messages.fetch()
    
                const filterNews = (msg: Message) => msg.content.toLowerCase().includes(nation.name.replace(/_/g, " ").toLowerCase() || nation.name.toLowerCase())
    
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
                    nationEmbed.addFields(embedField(
                        `Towns [${nation.towns.length}]`, 
                        "Too many towns to display!\nClick the **View All Towns** button to see the full list."
                    ))
            
                    nationEmbed.addButton('view_all_towns', 'View All Towns', ButtonStyle.Primary)
                } else {                   
                    nationEmbed.addFields(embedField(
                        `Towns [${nation.towns.length}]`, 
                        "```" + nationTownsString + "```"
                    ))
                }
    
                const alliances = await database.Aurora.getAlliances()
                if (alliances) {
                    const nationAlliances = alliances
                        .filter(A => A.nations.map(e => e.toLowerCase()).includes(nation.name.toLowerCase()))
                        .map(a => a.allianceName)
    
                    const len = nationAlliances?.length
                    if (len > 0) nationEmbed.addFields(embedField(
                        `Alliances [${len}]`, 
                        "```" + nationAlliances.join(", ") + "```"
                    ))
                }
    
                if (recentNews) {
                    const news = new News(recentNews)
                    const img = news?.images ? news.images[0] : null
    
                    nationEmbed.addFields(embedField(
                        "Recent News", 
                        news.message + (img ? " ([Image](" + img + "))" : "")
                    ))
                }
    
                const thumbnail = nation.flag ? [] : [AURORA.thumbnail] 
                return nationEmbed
                    .setFiles(thumbnail)
                    .editInteraction(interaction)
            }

            if (subCmd == "worth") {
                nationEmbed.setTitle(`Nation Worth | ${backtick(nation.name)}`)
                return nationEmbed.editInteraction(interaction)
            }
        }
    }, data: new SlashCommandBuilder()
        .setName("nation")
        .setDescription("Displays info for a nation.")
        .addSubcommand(subCmd => subCmd.setName('lookup')
            .setDescription('Get detailed information for a nation.')
            .addStringOption(option => option
                .setName("name")
                .setDescription("The name of the nation.")
                .setRequired(true)
            )
        )
        .addSubcommand(subCmd => subCmd.setName('activity')
            .setDescription('Gets activity data for members of a nation.')
            .addStringOption(option => option
                .setName("name")
                .setDescription("The name of the nation.")
                .setRequired(true)
            )
        )
        .addSubcommand(subCmd => subCmd.setName('list')
            .setDescription('List nations using various comparators.')
            .addStringOption(option => option
                .setName("comparator")
                .setDescription("The comparator to use. Available: online, residents, chunks & name.")
            )
        )
        .addSubcommand(subCmd => subCmd.setName('worth')
            .setDescription('Displays a full breakdown of .')
            .addStringOption(option => option
                .setName("name")
                .setDescription("The name of the nation.")
                .setRequired(true)
            )
        )
}