import * as database from "../../bot/utils/database.js"

import { CustomEmbed, EntityType } from "../../bot/objects/CustomEmbed.js"

import type { SquaremapTown } from "earthmc"
import { Aurora, NotFoundError, formatString } from "earthmc"

import { 
    type Client, type Message, 
    EmbedBuilder, Colors
} from "discord.js"

import {
    databaseError, fetchError,
    defaultSort, sortByOrder, 
    devsFooter, embedField, 
    maxTownSize, auroraNationBonus,
    unixFromDate,
    AURORA
} from "../../bot/utils/fn.js"

import type { DBNation, DBSquaremapTown, TownDataItem } from "../../bot/types.js"

const invalidUsageEmbed = () => new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle("Invalid Arguments")
    .setDescription(`
        **Command Usage**:
        Get info on a single town - \`/town <name>\`
        Show a page-by-page display of all towns - \`/town list\`
    `)

export default {
    name: "town",
    description: "Displays info for a town.",
    slashCommand: true,
    aliases: ["t"],
    run: async (client: Client, message: Message, args: string[]) => {
        const req = args.join(" ")
        if (!req) return await message.reply({ embeds: [invalidUsageEmbed()] })
            .then(m => setTimeout(() => m.delete(), 15000)).catch(() => {})
        
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching town data, this might take a moment.")
            .setColor(Colors.Green)
        ]})

        let towns = await database.Aurora.getTowns()
        if (!towns) return await m.edit({ embeds: [databaseError] })
            .then(m => setTimeout(() => m.delete(), 10000))
            .catch(() => {})

        if (!towns) towns = await Aurora.Towns.all().then(arr => arr.map(t => {
            t.name = formatString(t.name, false)
            return t
        }))

        const townEmbed = new EmbedBuilder()

        //let onlineResidents = []

        const opt = args[0]
        const arg1 = args[1]?.toLowerCase()

        if (opt.toLowerCase() == "list") {
            if (!arg1) return

            if (arg1 == "online") {
                const ops = await Aurora.Players.online().catch(() => {})
                if (!ops) return await m.edit({ embeds: [fetchError] })
                    .then(m => setTimeout(() => m.delete(), 10000))
                    .catch(() => {})

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
                onlineTownData.forEach(town => {                   
                    // If town doesnt exist, add it.
                    if (!ctx[town.name]) {           
                        town.onlineResidents = town.residents.filter(r => ops.some(op => r === op.name))

                        ctx[town.name] = { 
                            name: town.name, 
                            nation: town.nation,
                            onlineResidents: town.onlineResidents
                        }

                        onlineTownDataFinal.push(ctx[town.name])
                    }
                })

                onlineTownDataFinal.sort((a, b) => b.onlineResidents.length - a.onlineResidents.length)

                const allData = onlineTownDataFinal
                    .map(town => `${town.name} (${town.nation}) - ${town.onlineResidents.length}`)
                    .join('\n').match(/(?:^.*$\n?){1,10}/mg)
                
                //#region Determine page
                let page = 1
                const split = req.split(" ")

                if (args[2] != null) if (split[2]) page = parseInt(split[2])
                else if (split[1]) page = parseInt(split[1])

                if (isNaN(page)) page = 0
                else page--
                //#endregion

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
                sortByOrder(towns, [
                    { key: 'name', callback: (n: string) => n.toLowerCase() },
                    { key: 'residents', callback: (arr: string) => arr.length },
                    { key: 'area' }
                ])
            }
            else { // /t list <nation>
                const foundNation = towns.find(town => town.nation.toLowerCase() == arg1)
                
                if (!foundNation) towns = defaultSort(towns)
                else {
                    // Set towns array to the filtered array (only towns that are in the specified nation)
                    towns = towns.filter(town => town.nation.toLowerCase() == arg1)
                    const arg2 = args[2]?.toLowerCase()

                    if (!arg2) towns = defaultSort(towns)
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
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

            const players = await database.getPlayers().catch(() => {})
            if (!players) return await m.edit({ embeds: [databaseError] })
                .then(m => setTimeout(() => m.delete(), 10000))
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

                    const dateB = unixFromDate(foundPlayerB.lastOnline.aurora)
                    const dateA = unixFromDate(foundPlayerA.lastOnline.aurora)

                    return dateB - dateA
                }
            })

            let page = 1
            if (isNaN(page)) page = 0
            else page--

            const allData = town.residents.map(resident => {
                const residentInPlayers = players.find(p => p.name == resident)

                if (residentInPlayers && residentInPlayers.lastOnline != null) 
                    return "``" + resident + "`` - " + `<t:${unixFromDate(residentInPlayers.lastOnline.aurora)}:R>`

                return "" + resident + " | Unknown"
            }).join('\n').match(/(?:^.*$\n?){1,10}/mg)

            const townColours = await Aurora.Towns.get(town.name).then((t: SquaremapTown) => t instanceof NotFoundError ? null : t.colours)
            const colour = !townColours ? Colors.Green : parseInt(townColours.fill.replace('#', '0x'))

            return new CustomEmbed(client, "Town Info | Activity in " + town.name)
                .setColor(colour)
                .setType(EntityType.Town)
                .setPage(page)
                .paginate(allData)
                .editMessage(m)
        }
        else if (args.length > 3 || args.length == null || opt == null) {
            return await m.edit({ embeds: [invalidUsageEmbed()] }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }
        
        //#region /t <name>
        const town = towns.find(t => t.name.toLowerCase() == opt.toLowerCase())
        if (!town) return m.edit({embeds: [new EmbedBuilder()
            .setTitle("Invalid town name!")
            .setDescription(opt + " doesn't seem to be a valid town name, please try again.")
            .setColor(Colors.Red)
            .setTimestamp()
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        towns = defaultSort(towns)

        const townName = town.name
        const townRank = (towns.findIndex(t => t.name == townName)) + 1
        const mayor = town.mayor.replace(/_/g, "\\_")
        
        // const townColours = await Aurora.Towns.get(town.name).then((t: SquaremapTown) => t instanceof NotFoundError ? null : t.colours)
        // const colour = !townColours ? Colors.Green : parseInt(townColours.fill.replace('#', '0x'))

        townEmbed.setColor(town.ruined ? Colors.Orange : Colors.Green)
            .setTitle((`Town Info | ${townName}${town.flags.capital ? " :star:" : ""}`) + (town.ruined ? " (Ruin)" : " | #" + townRank))
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        
        if (town.board) {
            townEmbed.setDescription(`*${town.board}*`)
        }

        const townResidentsLength = town.residents.length

        let townNation = (await database.Aurora.getNation(town.nation) ?? await Aurora.Nations.get(town.nation)) as DBNation
        if (townNation instanceof NotFoundError) {
            townNation = null
        }

        if (!town.ruined) {
            if (town.flags.capital) {
                const nationResidentsLength = townNation?.residents.length ?? 0

                townEmbed.addFields(embedField("Mayor",
                    `${nationResidentsLength >= 60 ? "God Emperor "
                    : nationResidentsLength >= 40 ? "Emperor "
                    : nationResidentsLength >= 30 ? "King "
                    : nationResidentsLength >= 20 ? "Duke "
                    : nationResidentsLength >= 10 ? "Count "
                    : nationResidentsLength >= 0  ? "Leader " : "" }\`${mayor}\``, true))
            } else {
                townEmbed.addFields(embedField("Mayor", 
                    `${townResidentsLength >= 28 ? "Lord "
                    : townResidentsLength >= 24 ? "Duke "
                    : townResidentsLength >= 20 ? "Earl "
                    : townResidentsLength >= 14 ? "Count "
                    : townResidentsLength >= 10 ? "Viscount "
                    : townResidentsLength >= 6 ? "Baron "
                    : townResidentsLength >= 2 ? "Chief "
                    : townResidentsLength == 1 ? "Hermit " : "" }\`${mayor}\``, true)) 
            }

            const nationWiki = town?.wikis.nation
            const nationString = !nationWiki ? `\`${town.nation}\`` : `[${town.nation}](${nationWiki})`

            townEmbed.addFields(
                embedField("Nation", nationString, true),
                embedField("Founded", `<t:${town.foundedTimestamp}:R>`, true)
            )
        }

        const townAreaStr = `\`${town.area}\` / `
        const multiplier = town.residents.length * 12

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
            // RESIDENTS
            if (townResidentsLength > 0) {
                if (townResidentsLength <= 50) {
                    townEmbed.addFields(embedField(
                        `Residents [${townResidentsLength}]`, 
                        "```" + town.residents.join(", ") + "```"
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
                        "```" + town.councillors.join(", ") + "```"
                    ))
                }    
                else townEmbed.addFields(embedField("Councillors", townCouncillorsLen.toString()))
            } 
            else townEmbed.addFields(embedField("Councillors", "None")) 

            // // ONLINE RESIDENTS
            // const townyData = await database.Aurora.getOnlinePlayerData() as any

            // if (!townyData) {
            //     townEmbed.addFields(embedField(
            //         "Online Residents", 
            //         "No residents are online in " + town.name
            //     ))
            // }
            // else {
            //     onlineResidents = removeDuplicates(town.residents.filter(resident => townyData.players.find(op => resident === op.account)))
            //     const onlineResidentsString = onlineResidents.toString().replace(/,/g, ", ")

            //     if (onlineResidents.length > 0) { 
            //         townEmbed.addFields(embedField(
            //             `Online Residents [${onlineResidents.length}]`, 
            //             "```" + onlineResidentsString + "```"
            //         ))
            //     }
            //     else townEmbed.addFields(embedField("Online Residents", `No residents are online in ${town.name}`))
            // }
        }

        const [green, red] = ["<:green_tick:1036290473708495028>", "<:red_tick:1036290475012915270>"]
        townEmbed.addFields(embedField("Flags", `
            ${town.flags.pvp ? green : red } PVP
            ${town.flags.public ? green : red } Public
        `))

        // ${town.mobs ? green : red } Mobs 
        // ${town.public ? green : red } Public
        // ${town.explosion ? green : red } Explosions 
        // ${town.fire ? green : red } Fire Spread

        m.edit({
            embeds: [townEmbed],
            files: [AURORA.thumbnail] 
        })
    }
}

type ExtractedTown = {
    name: string
    nation: string
    residentNames: string[]
    area: number
    wealth: number
}

function extractTownData(towns: DBSquaremapTown[]) {
    if (!towns) return []

    const townData: ExtractedTown[] = []
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

//const wealthStr = (wealth: number) => wealth ? `Wealth: \`${wealth}\`G` : `Wealth: ??`

async function sendList(client: Client, msg: Message, comparator: string, towns: DBSquaremapTown[]) {
    towns = defaultSort(towns)
    
    const townData = extractTownData(towns)
    const allData = townData.map((town, index) => `**${(index + 1)}**. ${town.name} (**${town.nation}**)\n` +
        `Residents: \`${town.residentNames.length}\`\n` +
        `Chunks: \`${town.area}\``
        //`${wealthStr(town.wealth)}`
    ).join('\n\n').match(/(?:^.*$\n\n?){1,15}/mg)

    const embed = new CustomEmbed(client, "Town Info | Town List")
        .setType(EntityType.Town)
        .setPage(comparator ? parseInt(comparator) : 0)
        .paginate(allData, "\n")

    await embed.editMessage(msg)
}
