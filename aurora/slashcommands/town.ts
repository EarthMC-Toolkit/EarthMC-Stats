import * as fn from '../../bot/utils/fn.js'
import * as emc from "earthmc"
import * as database from "../../bot/utils/database.js"

import Discord from "discord.js"

import { CustomEmbed, EntityType } from "../../bot/objects/CustomEmbed.js"

export default {
    name: "town",
    description: "Displays info for a town.",
    run: async (client: Discord.Client, interaction: Discord.ChatInputCommandInteraction) => {
        if (!interaction.options.getSubcommand()) {
            return await interaction.reply({embeds: [
                new Discord.EmbedBuilder()
                .setColor(Discord.Colors.Red)
                .setTitle("Command Usage")
                .setDescription("`/town <name>`, `/town list` or `/town activity <name>`")
            ], ephemeral: true})
        }

        await interaction.deferReply()

        database.Aurora.getTowns().then(async towns => {
            if (!towns) towns = await emc.Aurora.Towns.all().catch(err => console.log(err))

            towns = towns.map(t => {
                t.name = emc.formatString(t.name, false)
                return t
            })

            const townEmbed = new Discord.EmbedBuilder(),
                  nameArg = interaction.options.getString("name")

            if (interaction.options.getSubcommand() == "list") {
                const args2 = interaction.options.getString("comparator")
                if (!args2) return sendList(client, interaction, null, towns) // Regular '/town list'
                    
                const comparator = args2.toLowerCase()

                if (comparator == "online") {
                    const onlinePlayers = await emc.Aurora.Players.online().catch(() => {})
                    if (!onlinePlayers) return await interaction.editReply({embeds: [fn.fetchError]})

                    const onlineTownData = [],
                          onlineTownDataFinal = []

                    const len = towns.length
                    for (let i = 0; i < len; i++) {
                        const cur = towns[i]

                        onlineTownData.push({
                            name: cur.name,
                            nation: cur.nation,
                            residentNames: cur.residents,
                            onlineResidents: [],
                            onlineResidentAmount: 0,
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
                                onlineResidentAmount: a.onlineResidents.length,
                            }    

                            onlineTownDataFinal.push(temp[a.name])
                        }     
                    }, Object.create(null))

                    onlineTownDataFinal.sort((a, b) => b.onlineResidentAmount - a.onlineResidentAmount)

                    const allData = onlineTownDataFinal.map(town => `${town.name} (${town.nation}) - ${town.onlineResidentAmount}`).join('\n').match(/(?:^.*$\n?){1,10}/mg)
                        
                    new CustomEmbed(client, "Town Info | Online Residents")
                        .setType(EntityType.Town).paginate(allData, "```", "```")
                        .editInteraction(interaction)
                }
                else if (comparator == "residents") 
                    towns.sort((a, b) => { return b.residents.length - a.residents.length })   
                else if (comparator == "chunks" || comparator == "land" ||  comparator == "area") 
                    towns.sort((a, b) => { return b.area - a.area}) 
                else if (comparator == "name" || comparator == "alphabetical") {
                    towns.sort((a, b) => {      
                        const [aName, bName] = [a.name.toLowerCase(), b.name.toLowerCase()]                 
                        if (bName < aName) return 1
                        if (bName > aName) return -1
                        
                        const [aResLen, bResLen] = [a.residents.length, b.residents.length]
                        if (bResLen > aResLen) return 1
                        if (bResLen < aResLen) return -1

                        const [aArea, bArea] = [a.area, b.area]
                        if (bArea > aArea) return 1
                        if (bArea < aArea) return -1

                        return 0
                    })
                }
                else { // /t list <nation>
                    const nation = towns.some(town => town.nation.toLowerCase() == comparator)
                    
                    if (!nation) return interaction.editReply({embeds: [
                        new Discord.EmbedBuilder()
                            .setTitle("Invalid town name!")
                            .setDescription(comparator + " doesn't seem to be a valid town name, please try again.")
                            .setTimestamp().setColor(Discord.Colors.Red)
                        ], //ephemeral: true 
                    })
                        
                    // It exists, get only towns within the nation, and sort.
                    towns.map(town => town.nation.toLowerCase() == comparator)
                    towns = fn.defaultSort(towns)
                }
            }
            else if (interaction.options.getSubcommand() == "activity" && nameArg != null) {  
                const town = towns.find(t => t.name.toLowerCase() == nameArg.toLowerCase())

                if (!town) return interaction.editReply({embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle("Invalid town name!")
                        .setDescription(nameArg + " doesn't seem to be a valid town name, please try again.")
                        .setTimestamp().setColor(Discord.Colors.Red)
                    ], //ephemeral: true
                })

                database.getPlayers().then(async players => {
                    if (!players) return await interaction.editReply({embeds: [fn.databaseError]})

                    // Sort by highest offline duration
                    town.residents.sort((a, b) => {
                        const foundPlayerA = players.find(p => p.name == a),
                              foundPlayerB = players.find(p => p.name == b)

                        if (foundPlayerA && !foundPlayerB) return -1
                        if (!foundPlayerA && foundPlayerB) return 1

                        if (foundPlayerA && foundPlayerB) {
                            if (foundPlayerA.lastOnline === foundPlayerB.lastOnline.aurora) return 0 // identical? return 0 
                            else if (foundPlayerA.lastOnline === null) return 1 // a is null? last 
                            else if (foundPlayerB.lastOnline === null) return -1 // b is null? last

                            const dateB = fn.unixFromDate(foundPlayerB.lastOnline.aurora),
                                  dateA = fn.unixFromDate(foundPlayerA.lastOnline.aurora)

                            return dateB - dateA
                        }
                    })

                    const allData = town.residents.map(resident => {
                        const residentInPlayers = players.find(p => p.name == resident)

                        if (residentInPlayers && residentInPlayers.lastOnline != null) 
                            return "``" + resident + "`` - " + `<t:${fn.unixFromDate(residentInPlayers.lastOnline.aurora)}:R>`

                        return "" + resident + " | Unknown"
                    }).join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    new CustomEmbed(client, "Town Information | Activity in " + town.name)
                        .paginate(allData)
                        .editInteraction(interaction)
                })
            }
            else if (interaction.options.getSubcommand() == "lookup") { // /t <town>
                const town = towns.find(t => t.name.toLowerCase() == nameArg.toLowerCase())

                if (!town) return await interaction.editReply({embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle("Invalid town name!")
                        .setDescription(nameArg + " doesn't seem to be a valid town name, please try again.")
                        .setTimestamp().setColor(Discord.Colors.Red)
                    ], //ephemeral: true
                })

                towns = fn.defaultSort(towns)

                let onlineResidents = []

                const townRank = (towns.findIndex(t => t.name == town.name)) + 1,
                      mayor = town.mayor.replace(/_/g, "\\_")
                
                const townColours = await emc.Aurora.Towns.get(town.name).then((t: any) => {
                    return t instanceof emc.NotFoundError ? null : t.colourCodes
                })

                const colour = !townColours ? Discord.Colors.Green : parseInt(townColours.fill.replace('#', '0x'))
                
                townEmbed.setColor(town.ruined ? Discord.Colors.Orange : colour)
                townEmbed.setTitle(("Town Info | " + town.name + `${town.capital ? " :star:" : ""}`) + (town.ruined ? " (Ruin)" : " | #" + townRank))
                
                const townNation = await database.Aurora.getNation(town.nation).catch(() => {}) ?? await emc.Aurora.Nations.get(town.nation),
                      townResidentsLength = town.residents.length

                if (!town.ruined) {
                    if (town.capital) {
                        const nationResidentsLength = townNation?.residents?.length ?? 0

                        townEmbed.addFields(fn.embedField("Mayor", `${nationResidentsLength >= 60 ? "God Emperor "
                            : nationResidentsLength >= 40 ? "Emperor "
                            : nationResidentsLength >= 30 ? "King "
                            : nationResidentsLength >= 20 ? "Duke "
                            : nationResidentsLength >= 10 ? "Count "
                            : nationResidentsLength >= 0 ? "Leader " : ""}` + mayor, true
                        ))
                    } else {
                        townEmbed.addFields(fn.embedField("Mayor", `${ townResidentsLength >= 28 ? "Lord "
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

                const townAreaStr = `${town.area} / `
                if (town.nation != "No Nation") {
                    const nationBonus = fn.auroraNationBonus(townNation.residents.length)
                    const claimBonus = Math.min(nationBonus + (townResidentsLength * 8), fn.maxTownSize)

                    townEmbed.addFields(fn.embedField(
                        "Town Size", 
                        `${townAreaStr}${claimBonus} [NationBonus: ${nationBonus}]`
                    ))
                } else {
                    const claimBonus = Math.min(townResidentsLength * 8, fn.maxTownSize)
                    townEmbed.addFields(fn.embedField("Town Size", townAreaStr + claimBonus))
                }

                townEmbed.addFields(fn.embedField(
                    "Location", 
                    `[${town.x}, ${town.z}](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=6&x=${town.x}&y=64&z=${town.z})`, 
                    true
                ))

                townEmbed.setFooter(fn.devsFooter(client))
                    .setThumbnail('attachment://aurora.png')
                    .setTimestamp()

                if (!town.ruined) {
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

                    //#region "Online Residents" field
                    const townyData = await database.Aurora.getOnlinePlayerData() as any

                    if (!townyData) {
                        townEmbed.addFields(fn.embedField(
                            "Online Residents", 
                            "No residents are online in " + town.name + "."
                        ))
                    } else {
                        onlineResidents = fn.removeDuplicates(town.residents.filter(resident => townyData.players.find(op => resident === op.account)))
                        const onlineResLen = onlineResidents.length

                        if (onlineResLen > 0) {
                            townEmbed.addFields(fn.embedField(
                                `Online Residents [${onlineResLen}]`, 
                                "```" + onlineResidents.join(", ") + "```"
                            ))
                        }
                        else townEmbed.addFields(fn.embedField(
                            "Online Residents", 
                            "No residents are online in " + town.name + "."
                        ))
                    }
                    //#endregion
                }

                const [green, red] = ["<:green_tick:1036290473708495028>", "<:red_tick:1036290475012915270>"]
                townEmbed.addFields(fn.embedField("Flags", `
                    ${town.pvp ? green : red } PVP
                    ${town.mobs ? green : red } Mobs 
                    ${town.public ? green : red } Public
                    ${town.explosion ? green : red } Explosions 
                    ${town.fire ? green : red } Fire Spread
                `))

                interaction.editReply({embeds: [townEmbed], files: [fn.AURORA.thumbnail]})
            } else {
                return await interaction.editReply({embeds: [
                    new Discord.EmbedBuilder()
                        .setDescription("Invalid arguments! Usage: `/t townName` or `/t list`")
                        .setFooter(fn.devsFooter(client))
                        .setTimestamp()
                        .setColor(Discord.Colors.Red)
                    ], //ephemeral: true
                })
            }
        })
    }, data: new Discord.SlashCommandBuilder()
        .setName("town")
        .setDescription("Displays info for a town.")
        .addSubcommand(subcommand => subcommand
            .setName('lookup')
            .setDescription('Get detailed information for a town')
            .addStringOption(option => option.setName("name").setDescription("The name of the town to lookup.").setRequired(true)))
        .addSubcommand(subcommand => subcommand
            .setName('activity')
            .setDescription('Gets activity data for members of a town.')
            .addStringOption(option => option.setName("name").setDescription("The name of the town to get activity data for.").setRequired(true)))              
        .addSubcommand(subcommand => subcommand
            .setName('list')
            .setDescription('List towns using various comparators.')
            .addStringOption(option => option.setName("comparator").setDescription("The comparator to use which the list will be filtered by.")))
}

function extractTownData(towns: any[]) {
    if (!towns) return []

    const townData = [],
          len = towns.length

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

function sendList(
    client: Discord.Client, 
    interaction: Discord.ChatInputCommandInteraction, 
    comparator: string, 
    towns: any[]
) {
    towns = fn.defaultSort(towns)
  
    const townData = extractTownData(towns)
    const allData = townData.map((town, index) => (index + 1) + ". **" + town.name + " (" + town.nation + ")**" + 
        "\n```Residents: " + town.residentNames.length + "``````Chunks: " + town.area + "```").join('\n').match(/(?:^.*$\n?){1,8}/mg)

    new CustomEmbed(client, "Town Info | Town List")
        .setType(EntityType.Town)
        .setPage(comparator ? parseInt(comparator) : 0)
        .paginate(allData, "\n")
        .editInteraction(interaction)
}
