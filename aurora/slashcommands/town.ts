import * as database from "../../bot/utils/database.js"

import {
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import { CustomEmbed, EntityType } from "../../bot/objects/CustomEmbed.js"
import { 
    AURORA, auroraNationBonus, 
    databaseError, defaultSort, 
    devsFooter, embedField, fetchError, 
    maxTownSize, 
    sortByOrder, unixFromDate 
} from '../../bot/utils/fn.js'

import { Aurora, formatString, NotFoundError } from 'earthmc'

import type { DBNation, DBSquaremapTown } from '../../bot/types.js'

export default {
    name: "town",
    description: "Displays info for a town.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        if (!interaction.options.getSubcommand()) {
            return await interaction.reply({embeds: [
                new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("Command Usage")
                .setDescription("`/town <name>`, `/town list` or `/town activity <name>`")
            ], ephemeral: true})
        }

        await interaction.deferReply()

        let towns = await database.Aurora.getTowns()
        if (!towns) return await interaction.reply({ embeds: [databaseError] })
            .then(m => setTimeout(() => m.delete(), 10000))
            .catch(() => {})

        // TODO: Handle this error case
        if (!towns) towns = await Aurora.Towns.all().then(arr => arr.map(t => {
            t.name = formatString(t.name, false)
            return t
        }))

        const townEmbed = new EmbedBuilder()
        const nameArg = interaction.options.getString("name")

        const subCmdName = interaction.options.getSubcommand().toLowerCase()
        if (subCmdName == "list") {
            const args2 = interaction.options.getString("comparator")
            if (!args2) return sendList(client, interaction, null, towns) // Regular '/town list'
                
            const comparator = args2.toLowerCase()

            if (comparator == "online") {
                const onlinePlayers = await Aurora.Players.online().catch(() => {})
                if (!onlinePlayers) return await interaction.editReply({ embeds: [fetchError] })

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
                const temp: Record<string, any> = {}
                onlineTownData.forEach(a => {                   
                    // If town doesnt exist, add it.
                    if (!temp[a.name]) {           
                        a.onlineResidents = a.residentNames.filter(resident => onlinePlayers.find(op => resident === op.name))

                        temp[a.name] = { 
                            name: a.name, 
                            nation: a.nation,
                            onlineResidents: a.onlineResidents,
                            onlineResidentAmount: a.onlineResidents.length
                        }

                        onlineTownDataFinal.push(temp[a.name])
                    }     
                }, Object.create(null))

                onlineTownDataFinal.sort((a, b) => b.onlineResidentAmount - a.onlineResidentAmount)

                const allData = onlineTownDataFinal.map(town => `${town.name} (${town.nation}) - ${town.onlineResidentAmount}`)
                    .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                new CustomEmbed(client, "Town Info | Online Residents")
                    .setType(EntityType.Town)
                    .paginate(allData, "```", "```")
                    .editInteraction(interaction)
            }
            else if (comparator == "residents") 
                towns.sort((a, b) => b.residents.length - a.residents.length)   
            else if (comparator == "chunks" || comparator == "land" || comparator == "area") 
                towns.sort((a, b) => b.area - a.area) 
            else if (comparator == "name" || comparator == "alphabetical") {
                sortByOrder(towns, [
                    { key: "name", callback: k => k.toLowerCase() },
                    { key: "residents", callback: arr => arr.length },
                    { key: "area" }
                ])
            }
            else { // /t list <nation>
                const nation = towns.some(town => town.nation.toLowerCase() == comparator)
                
                if (!nation) return interaction.editReply({embeds: [
                    new EmbedBuilder()
                        .setTitle("Invalid town name!")
                        .setDescription(comparator + " doesn't seem to be a valid town name, please try again.")
                        .setTimestamp().setColor(Colors.Red)
                    ] //ephemeral: true 
                })
                    
                // It exists, get only towns within the nation, and sort.
                towns.map(town => town.nation.toLowerCase() == comparator)
                towns = defaultSort(towns)
            }
        }
        else if (subCmdName == "activity" && nameArg != null) {  
            const town = towns.find(t => t.name.toLowerCase() == nameArg.toLowerCase())

            if (!town) return interaction.editReply({embeds: [new EmbedBuilder()
                .setTitle("Invalid town name!")
                .setDescription(nameArg + " doesn't seem to be a valid town name, please try again.")
                .setTimestamp().setColor(Colors.Red)
            ] /* ephemeral: true */})

            database.getPlayers().then(async players => {
                if (!players) return await interaction.editReply({embeds: [databaseError]})

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
                    const residentInPlayers = players.find(p => p.name == resident)

                    if (residentInPlayers && residentInPlayers.lastOnline != null) 
                        return "``" + resident + "`` - " + `<t:${unixFromDate(residentInPlayers.lastOnline.aurora)}:R>`

                    return "" + resident + " | Unknown"
                }).join('\n').match(/(?:^.*$\n?){1,10}/mg)

                new CustomEmbed(client, "Town Information | Activity in " + town.name)
                    .paginate(allData)
                    .editInteraction(interaction)
            })
        }
        else if (subCmdName == "lookup") { // /t <town>
            const town = towns.find(t => t.name.toLowerCase() == nameArg.toLowerCase())

            if (!town) return await interaction.editReply({embeds: [new EmbedBuilder()
                .setTitle("Invalid town name!")
                .setDescription(nameArg + " doesn't seem to be a valid town name, please try again.")
                .setTimestamp().setColor(Colors.Red)
            ] /*ephemeral: true */})

            towns = defaultSort(towns)

            //let onlineResidents = []

            const townRank = (towns.findIndex(t => t.name == town.name)) + 1
            const mayor = town.mayor.replace(/_/g, "\\_")
            
            // const townColours = await Aurora.Towns.get(town.name).then((t: SquaremapTown) => {
            //     return t instanceof NotFoundError ? null : t.colours
            // })

            // const colour = !townColours ? Colors.Green : parseInt(townColours.fill.replace('#', '0x'))
            
            townEmbed.setColor(town.ruined ? Colors.Orange : Colors.Green)
            townEmbed.setTitle(("Town Info | `" + town.name + `\`${town.flags.capital ? " :star:" : ""}`) + (town.ruined ? " (Ruin)" : " | #" + townRank))
            
            if (town.board) {
                townEmbed.setDescription(`*${town.board}*`)
            }

            let townNation = (await database.Aurora.getNation(town.nation) ?? await Aurora.Nations.get(town.nation)) as DBNation
            if (townNation instanceof NotFoundError) {
                townNation = null
            }

            const townResidentsLength = town.residents.length
            if (!town.ruined) {
                if (town.flags.capital) {
                    const nationResidentsLength = townNation?.residents?.length ?? 0

                    townEmbed.addFields(embedField("Mayor", `${nationResidentsLength >= 60 ? "God Emperor "
                        : nationResidentsLength >= 40 ? "Emperor "
                        : nationResidentsLength >= 30 ? "King "
                        : nationResidentsLength >= 20 ? "Duke "
                        : nationResidentsLength >= 10 ? "Count "
                        : nationResidentsLength >= 0  ? "Leader " : "" }\`${mayor}\``, true
                    ))
                } else {
                    townEmbed.addFields(embedField("Mayor", `${ townResidentsLength >= 28 ? "Lord "
                        : townResidentsLength >= 24 ? "Duke " 
                        : townResidentsLength >= 20 ? "Earl "
                        : townResidentsLength >= 14 ? "Count "
                        : townResidentsLength >= 10 ? "Viscount "
                        : townResidentsLength >= 6  ? "Baron "
                        : townResidentsLength >= 2  ? "Chief "
                        : townResidentsLength == 1  ? "Hermit " : "" }\`${mayor}\``, true
                    ))
                }

                const disc = townNation?.discord
                const nationString = !disc ? `\`${town.nation}\`` : `[${townNation.name}](${disc})`
                
                townEmbed.addFields(
                    embedField("Nation", nationString, true),
                    embedField("Founded", `<t:${town.foundedTimestamp}:R>`)
                )
            }

            const townAreaStr = `\`${town.area}\` / `
            const multiplier = townResidentsLength * 12
            
            if (town.nation != "No Nation") {
                const nationBonus = auroraNationBonus(townNation.residents.length)
                const claimBonus = Math.min(nationBonus + multiplier, maxTownSize)

                townEmbed.addFields(
                    embedField("Size", `${townAreaStr}\`${claimBonus}\` [Nation Bonus: \`${nationBonus}\`]`)
                )
            } else {
                const claimBonus = Math.min(multiplier, maxTownSize)
                townEmbed.addFields(embedField("Size", `${townAreaStr}\`${claimBonus}`, true))
            }

            if (town.wealth) {
                townEmbed.addFields(embedField("Wealth", `\`${town.wealth}\`G`, true))
            }

            townEmbed.addFields(embedField(
                "Location",
                `[${town.x}, ${town.z}](https://map.earthmc.net?worldname=earth&mapname=flat&zoom=6&x=${town.x}&y=64&z=${town.z})`, 
                true
            ))

            townEmbed.setFooter(devsFooter(client))
                .setThumbnail('attachment://aurora.png')
                .setTimestamp()

            if (!town.ruined) {
                if (townResidentsLength > 0) {
                    if (townResidentsLength <= 50) {
                        townEmbed.addFields(embedField(
                            `Residents [${townResidentsLength}]`, 
                            "```" + town.residents.join(", ") + "```"
                        ))
                    }    
                    else townEmbed.addFields(embedField("Residents", townResidentsLength.toString()))
                } 
                else townEmbed.addFields(embedField("Residents", "There are no residents in this town?")) 

                const townCouncillorsLen = town.councillors.length
                if (townCouncillorsLen > 0) {
                    if (townCouncillorsLen <= 50) {
                        townEmbed.addFields(embedField(
                            `Councillors [${townCouncillorsLen}]`, 
                            "```" + town.councillors.join(", ") + "```"
                        ))
                    }
                    else townEmbed.addFields(embedField("Councillors", townCouncillorsLen.toString()))
                } 
                else townEmbed.addFields(embedField("Councillors", "None")) 

                // //#region "Online Residents" field
                // const townyData = await database.Aurora.getOnlinePlayerData()

                // if (!townyData) {
                //     townEmbed.addFields(embedField(
                //         "Online Residents", 
                //         "No residents are online in " + town.name + "."
                //     ))
                // } else {
                //     onlineResidents = removeDuplicates(town.residents.filter(res => townyData.players.find(op => res === op.name)))
                //     const onlineResLen = onlineResidents.length

                //     if (onlineResLen > 0) {
                //         townEmbed.addFields(embedField(
                //             `Online Residents [${onlineResLen}]`, 
                //             "```" + onlineResidents.join(", ") + "```"
                //         ))
                //     }
                //     else townEmbed.addFields(embedField(
                //         "Online Residents", 
                //         "No residents are online in " + town.name + "."
                //     ))
                // }
                // //#endregion
            }

            const [green, red] = ["<:green_tick:1036290473708495028>", "<:red_tick:1036290475012915270>"]
            townEmbed.addFields(embedField("Flags", `
                ${town.flags.pvp ? green : red } PVP
                ${town.flags.public ? green : red } Public
            `))

            // ${town.flags.mobs ? green : red } Mobs 
            // ${town.flags.public ? green : red } Public
            // ${town.flags.explosion ? green : red } Explosions 
            // ${town.flags.fire ? green : red } Fire Spread

            return interaction.editReply({
                embeds: [townEmbed],
                files: [AURORA.thumbnail]
            })
        }

        return await interaction.editReply({embeds: [new EmbedBuilder()
            .setDescription("Invalid arguments! Usage: `/t townName` or `/t list`")
            .setFooter(devsFooter(client))
            .setTimestamp()
            .setColor(Colors.Red)
        ]})
    }, data: new SlashCommandBuilder()
        .setName("town")
        .setDescription("Displays info for a town.")
        .addSubcommand(subCmd => subCmd
            .setName('lookup')
            .setDescription('Get detailed information for a town')
            .addStringOption(option => option.setName("name").setDescription("The name of the town to lookup.").setRequired(true)))
        .addSubcommand(subCmd => subCmd
            .setName('activity')
            .setDescription('Gets activity data for members of a town.')
            .addStringOption(option => option.setName("name").setDescription("The name of the town to get activity data for.").setRequired(true)))              
        .addSubcommand(subCmd => subCmd
            .setName('list')
            .setDescription('List towns using various comparators.')
            .addStringOption(option => option.setName("comparator").setDescription("The comparator to use which the list will be filtered by.")))
}

function extractTownData(towns: DBSquaremapTown[]) {
    if (!towns) return []

    const townData = []
    const len = towns.length

    for (let i = 0; i < len; i++) {     
        const cur = towns[i]

        townData.push({
            name: cur.name,
            nation: cur.nation,
            residentNames: cur.residents,
            area: cur.area,
            wealth: cur.wealth
        }) 
    }

    return townData
}


const wealthStr = (wealth: number) => wealth ? `Wealth: \`${wealth}\`G` : `Wealth: ??` 

function sendList(
    client: Client, 
    interaction: ChatInputCommandInteraction, 
    comparator: string, 
    towns: DBSquaremapTown[]
) {
    towns = defaultSort(towns)
  
    const townData = extractTownData(towns)

    const allData = townData.map((town, index) => `**${(index + 1)}**. ${town.name} (**${town.nation}**)\n` +
        `Residents: \`${town.residentNames.length}\`\n` +
        `Chunks: \`${town.area}\`\n` + 
        `${wealthStr(town.wealth)}`
    ).join('\n\n').match(/(?:^.*$\n\n?){1,16}/mg)

    new CustomEmbed(client, "Town Info | Town List")
        .setType(EntityType.Town)
        .setPage(comparator ? parseInt(comparator) : 0)
        .paginate(allData, "\n")
        .editInteraction(interaction)
}
