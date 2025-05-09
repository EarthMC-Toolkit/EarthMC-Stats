import { Aurora, formatString, NotFoundError } from 'earthmc'

import {
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import type { 
    TownDataItem,
    DBSquaremapTown, DBSquaremapNation
} from '../../bot/types.js'

import { 
    AURORA, auroraNationBonus, 
    databaseError, defaultSort, 
    devsFooter, embedField, fetchError, 
    sortByKey, unixFromDate,
    maxTownSize,
    backtick,
    timestampRelative,
    backticks
} from '../../bot/utils/index.js'

import { CustomEmbed, EntityType } from "../../bot/objects/CustomEmbed.js"
import * as database from "../../bot/utils/db/index.js"

const invalidUsageEmbed = () => new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle("Invalid Arguments")
    .setDescription(`
        **Command Usage**:
        Get info on a single town - \`/town <name>\`
        Show a page-by-page display of all towns - \`/town list\`
    `)

const slashCmdData = new SlashCommandBuilder()
    .setName("town")
    .setDescription("Displays info for a town.")
    .addSubcommand(subCmd => subCmd.setName('lookup')
        .setDescription("Get detailed information for a town.")
        .addStringOption(option => option.setName("name")
            .setDescription("The name of the town to lookup.")
            .setRequired(true)
        )
    )
    .addSubcommand(subCmd => subCmd.setName('activity')
        .setDescription("Gets activity data for members of a town.")
        .addStringOption(option => option.setName("name")
            .setDescription("The name of the town to get activity data for.")
            .setRequired(true)
        )
    )
    .addSubcommandGroup(subCmdGroup => subCmdGroup.setName('list')
        .setDescription("List towns using various comparators.")
        .addSubcommand(subCmd => subCmd.setName("all")
            .setDescription("Ouputs a list of all towns.")
        )
        .addSubcommand(subCmd => subCmd.setName("online")
            .setDescription("Ouputs a list of towns with their respective number of online residents. Sorted by Most -> Least.")
        )
        .addSubcommand(subCmd => subCmd.setName("chunks")
            .setDescription("Outputs a list of towns sorted by chunks in the order: Highest -> Lowest.")
        )
        .addSubcommand(subCmd => subCmd.setName("residents")
            .setDescription("Outputs a list of towns sorted by amount of residents in the order: Highest -> Lowest.")
        )
        .addSubcommand(subCmd => subCmd.setName("alphabetical")
            .setDescription("Outputs a list of all towns sorted in alphabetical order.")
        )
        .addSubcommand(subCmd => subCmd.setName("nation")
            .setDescription("Ouputs a list of towns that are only within the specified nation.")
            .addStringOption(option => option.setName("name")
                .setDescription("The name of the nation to filter towns by.")
                .setRequired(true)
            )
        )
    )

export default {
    name: "town",
    description: "Displays info for a town.",
    data: slashCmdData,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // TODO: Don't think we even need this anymore?
        if (!interaction.options.getSubcommand()) {
            return await interaction.reply({ embeds: [invalidUsageEmbed()], ephemeral: true })
        }

        await interaction.deferReply()

        //#region Fetch towns
        // TODO: 3 checks seems unwieldy, reduce if possible.
        let towns = await database.AuroraDB.getTowns()
        if (!towns) return await interaction.editReply({ embeds: [databaseError] })
            .then(m => setTimeout(() => m.delete(), 10000))
            .catch(() => {})

        if (!towns) towns = await Aurora.Towns.all().then(arr => arr.map(t => {
            t.name = formatString(t.name, false)
            return t
        })).catch(() => null)

        if (!towns) return await interaction.editReply({ embeds: [fetchError] })
            .then(m => setTimeout(() => m.delete(), 10000))
        //#endregion

        const subCmd = interaction.options.getSubcommand().toLowerCase()
        if (subCmd == "lookup") { // /t <town>
            const nameArg = interaction.options.getString("name", true)

            const town = towns.find(t => t.name.toLowerCase() == nameArg.toLowerCase())
            if (!town) return await interaction.editReply({embeds: [new EmbedBuilder()
                .setTitle("Invalid Town!")
                .setDescription(`No town with name ${backtick(nameArg)} exists.`)
                .setColor(Colors.Red)
                .setTimestamp()
            ]})

            return sendSingle(client, interaction, towns, town)
        }

        // TODO: Use timestamps from OAPI - keep current logic (DB dates) as fallback.
        if (subCmd == "activity") {
            const nameArg = interaction.options.getString("name", true)

            const town = towns.find(t => t.name.toLowerCase() == nameArg.toLowerCase())
            if (!town) return interaction.editReply({embeds: [new EmbedBuilder()
                .setTitle("Invalid town name!")
                .setDescription(`${nameArg} doesn't seem to be a valid town name, please try again.`)
                .setColor(Colors.Red)
                .setTimestamp()
            ]})

            const players = await database.getPlayers()
            if (!players) return await interaction.editReply({ embeds: [databaseError] })

            // Sort by highest offline duration
            town.residents.sort((a, b) => {
                const foundPlayerA = players.find(p => p.name == a)
                const foundPlayerB = players.find(p => p.name == b)

                if (foundPlayerA && !foundPlayerB) return -1
                if (!foundPlayerA && foundPlayerB) return 1

                if (foundPlayerA && foundPlayerB) {
                    if (foundPlayerA.lastOnline === foundPlayerB.lastOnline.aurora) return 0 // identical? return 0 
                    else if (foundPlayerA.lastOnline === null) return 1 // a is null? last 
                    else if (foundPlayerB.lastOnline === null) return -1 // b is null? last

                    const dateB = unixFromDate(foundPlayerB.lastOnline.aurora)
                    const dateA = unixFromDate(foundPlayerA.lastOnline.aurora)

                    return dateB - dateA
                }
            })

            const allData = town.residents.map(resident => {
                const residentPlayer = players.find(p => p.name == resident)
    
                const loTimestamp = residentPlayer?.lastOnline?.aurora
                const tsOrUnknown = loTimestamp != null 
                    ? timestampRelative(loTimestamp)
                    : "Unknown"

                return `${backtick(resident)} - ${tsOrUnknown}`
            }).join('\n').match(/(?:^.*$\n?){1,15}/mg)

            return new CustomEmbed(client, `Town Information | Activity in ${backtick(town.name)}`)
                .paginate(allData)
                .editInteraction(interaction)
        }

        const subCmdGroup = interaction.options.getSubcommandGroup()
        if (subCmdGroup == "list") {
            if (subCmd == "all") {
                towns = defaultSort(towns)
                return sendList(client, interaction, towns)
            }

            if (subCmd == "online") {
                const ops = await Aurora.Players.online().catch(() => {})
                if (!ops) return await interaction.editReply({ embeds: [fetchError] })
    
                const onlineTownData: TownDataItem[] = []
                const onlineTownDataFinal: TownDataItem[] = []
    
                const len = towns.length
                for (let i = 0; i < len; i++) {
                    const cur = towns[i]
    
                    onlineTownData.push({
                        name: cur.name,
                        nation: cur.nation,
                        residents: cur.residents,
                        onlineResidents: []
                    }) 
                }
    
                // Function to get rid of duplicates and add up residents and chunks.
                const ctx: Record<string, TownDataItem> = {}
                onlineTownData.forEach(t => {
                    // If town doesnt exist, add it.
                    if (!ctx[t.name]) {
                        t.onlineResidents = t.residents.filter(res => ops.some(op => res === op.name))
    
                        ctx[t.name] = {
                            name: t.name,
                            nation: t.nation,
                            onlineResidents: t.onlineResidents
                        }

                        onlineTownDataFinal.push(ctx[t.name])
                    }
                })
    
                onlineTownDataFinal.sort((a, b) => b.onlineResidents.length - a.onlineResidents.length)
    
                const allData = onlineTownDataFinal.map(town => `${town.name} (${town.nation}) - ${town.onlineResidents.length}`)
                    .join('\n').match(/(?:^.*$\n?){1,10}/mg)
    
                return new CustomEmbed(client, "Town Info | Online Residents")
                    .setType(EntityType.Town)
                    .paginate(allData, "```", "```")
                    .editInteraction(interaction)
            }
            
            if (subCmd == "chunks") {
                towns.sort((a, b) => b.area - a.area)
                return sendList(client, interaction, towns)
            }

            if (subCmd == "residents") {
                towns.sort((a, b) => b.residents.length - a.residents.length)
                return sendList(client, interaction, towns)
            }

            if (subCmd == "alphabetical") {
                sortByKey(towns, "name")
                return sendList(client, interaction, towns)
            }
            
            if (subCmd == "nation") { // /t list <nation>
                const nationNameArg = interaction.options.getString("name")
                const nation = towns.some(town => town.nation.toLowerCase() == nationNameArg.toLowerCase())
                if (!nation) return interaction.editReply({embeds: [new EmbedBuilder()
                    .setTitle("Invalid Nation!")
                    .setDescription(`Could not find any towns belonging to nation: ${backtick(nationNameArg)}.`)
                    .setTimestamp().setColor(Colors.Red)
                ]})
    
                // Nation exists, filter by towns only within the nation.
                towns = towns.filter(town => town.nation.toLowerCase() == nationNameArg.toLowerCase())
                return sendList(client, interaction, defaultSort(towns))
            }
        }

        // NOTE: We might hit this if a group exists but isn't implemented.
        return await interaction.editReply({ embeds: [invalidUsageEmbed()] })
    }
}

interface ExtractedTown {
    name: string
    nation: string
    residentNames: string[]
    area: number
    //wealth: number
}

const extractTownData = (towns: DBSquaremapTown[]) => {
    if (!towns) return []

    const townData: ExtractedTown[] = []
    const len = towns.length

    for (let i = 0; i < len; i++) {     
        const cur = towns[i]

        townData.push({
            name: cur.name,
            nation: cur.nation,
            residentNames: cur.residents,
            area: cur.area
            //wealth: cur.wealth
        }) 
    }

    return townData
}

//const wealthStr = (wealth: number) => wealth ? `Wealth: \`${wealth}\`G` : `Wealth: ??` 

function sendList(
    client: Client, 
    interaction: ChatInputCommandInteraction, 
    towns: DBSquaremapTown[],
    page = 0
) {
    const townData = extractTownData(towns)
    const allData = townData.map((town, index) => `**${(index + 1)}**. ${town.name} (**${town.nation}**)\n` +
        `Residents: ${backtick(town.residentNames.length)}\n` +
        `Chunks: ${backtick(town.area)}`
        //`${wealthStr(town.wealth)}`
    ).join('\n\n').match(/(?:^.*$\n\n?){1,15}/mg)

    new CustomEmbed(client, "Town Info | Town List")
        .setType(EntityType.Town)
        .setPage(page ?? 0)
        .paginate(allData, "\n")
        .editInteraction(interaction)
}

async function sendSingle(
    client: Client, interaction: ChatInputCommandInteraction, 
    towns: DBSquaremapTown[], town: DBSquaremapTown
) {
    defaultSort(towns)

    const townEmbed = new EmbedBuilder()
    const townRank = (towns.findIndex(t => t.name == town.name)) + 1
    //const mayor = town.mayor.replace(/_/g, "\\_")
    
    // const townColours = await Aurora.Towns.get(town.name).then((t: SquaremapTown) => {
    //     return t instanceof NotFoundError ? null : t.colours
    // })

    // const colour = !townColours ? Colors.Green : parseInt(townColours.fill.replace('#', '0x'))

    let title = `Town Info | ${backtick(town.name)}${town.flags.capital ? " :star:" : ""}`
    title += town.ruined ? ` (Ruin)` : ` | #${townRank}` // Add rank if not ruined.

    townEmbed.setTitle(title)
    townEmbed.setColor(town.ruined ? Colors.Orange : Colors.Green)
    
    if (town.board) {
        townEmbed.setDescription(`*${town.board}*`)
    }

    let townNation = await(
        await database.AuroraDB.getNation(town.nation) ?? 
        await Aurora.Nations.get(town.nation)
    ) as DBSquaremapNation

    // Handle 
    if (townNation instanceof NotFoundError) {
        townNation = null
    }

    const townResidentsLength = town.residents.length
    const nationResidentsLength = townNation?.residents?.length ?? 0

    if (!town.ruined) {
        if (town.flags.capital) {
            townEmbed.addFields(embedField("Mayor", `${nationResidentsLength >= 60 ? "God Emperor "
                : nationResidentsLength >= 40 ? "Emperor "
                : nationResidentsLength >= 30 ? "King "
                : nationResidentsLength >= 20 ? "Duke "
                : nationResidentsLength >= 10 ? "Count "
                : nationResidentsLength >= 0  ? "Leader " : "" }\`${town.mayor}\``, true
            ))
        } else {
            townEmbed.addFields(embedField("Mayor", `${ townResidentsLength >= 28 ? "Lord "
                : townResidentsLength >= 24 ? "Duke " 
                : townResidentsLength >= 20 ? "Earl "
                : townResidentsLength >= 14 ? "Count "
                : townResidentsLength >= 10 ? "Viscount "
                : townResidentsLength >= 6  ? "Baron "
                : townResidentsLength >= 2  ? "Chief "
                : townResidentsLength == 1  ? "Hermit " : "" }\`${town.mayor}\``, true
            ))
        }

        const nationWiki = town?.wikis?.nation
        const nationString = !nationWiki ? `${backtick(town.nation)}` : `[${town.nation}](${nationWiki})`
        
        townEmbed.addFields(
            embedField("Nation", nationString, true),
            embedField("Founded", timestampRelative(town.foundedTimestamp), true)
        )
    }

    const townAreaStr = `${backtick(town.area)} / `
    const multiplier = townResidentsLength * 12
    
    if (town.nation != "No Nation") {
        const nationBonus = auroraNationBonus(nationResidentsLength)
        const claimBonus = Math.min(nationBonus + multiplier, maxTownSize)

        townEmbed.addFields(
            embedField("Size", `${townAreaStr}${backtick(claimBonus)} [Nation Bonus: ${backtick(nationBonus)}]`)
        )
    } else {
        const claimBonus = Math.min(multiplier, maxTownSize)
        townEmbed.addFields(embedField("Size", `${townAreaStr}${backtick(claimBonus)}`, true))
    }

    // if (town.wealth) {
    //     townEmbed.addFields(embedField("Wealth", `\`${town.wealth}\`G`, true))
    // }

    const mapUrl = `https://map.earthmc.net?worldname=earth&zoom=6&x=${town.x}&z=${town.z}`
    townEmbed.addFields(embedField("Location", `[${town.x}, ${town.z}](${mapUrl})`, true))

    townEmbed.setFooter(devsFooter(client))
        .setThumbnail('attachment://aurora.png')
        .setTimestamp()

    if (!town.ruined) {
        if (townResidentsLength > 0) {
            if (townResidentsLength <= 50) {
                townEmbed.addFields(embedField(
                    `Residents [${townResidentsLength}]`, 
                    backticks(town.residents.join(", "))
                ))
            }
            else townEmbed.addFields(embedField("Residents", `\`${townResidentsLength.toString()}\``))
        }
        else townEmbed.addFields(embedField("Residents", "There are no residents in this town?")) 

        const townCouncillorsLen = town.councillors.length
        if (townCouncillorsLen > 0) {
            if (townCouncillorsLen <= 50) {
                townEmbed.addFields(embedField(
                    `Councillors [${townCouncillorsLen}]`, 
                    backticks(town.councillors.join(", "))
                ))
            }
            else townEmbed.addFields(embedField("Councillors", townCouncillorsLen.toString()))
        } 
        else townEmbed.addFields(embedField("Councillors", "None")) 
    }

    const [green, red] = ["<:green_tick:1036290473708495028>", "<:red_tick:1036290475012915270>"]
    townEmbed.addFields(embedField("Flags", `
        ${town.flags.pvp ? green : red } PVP
        ${town.flags.public ? green : red } Public
    `))

    // ${town.flags.mobs ? green : red } Mobs 
    // ${town.flags.explosion ? green : red } Explosions 
    // ${town.flags.fire ? green : red } Fire Spread

    return interaction.editReply({
        embeds: [townEmbed],
        files: [AURORA.thumbnail]
    })
}