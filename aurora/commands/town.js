const Discord = require("discord.js"),
      fn = require('../../bot/utils/fn'),
      { Aurora, formatString } = require("earthmc"),
      database = require("../../bot/utils/database"),
      { CustomEmbed, Type } = require("../../bot/objects/CustomEmbed")

module.exports = {
    name: "town",
    description: "Displays info for a town.",
    slashCommand: true,
    aliases: ["t"],
    run: async (client, message, args) => {
        const req = args.join(" "),
              m = await message.reply({embeds: [new Discord.MessageEmbed()
                .setTitle("<a:loading:966778243615191110> Fetching town data, this might take a moment.")
                .setColor("GREEN")]})

        if (!req) return await m.edit(new Discord.MessageEmbed()
            .setColor("RED")
            .setTitle("Command Usage")
            .setDescription("`/town <name>`\n`/town list`")
        ).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
        
        database.Aurora.getTowns().then(async towns => {
            if (!towns) towns = await Aurora.Towns.all().catch(err => console.log(err))

            towns = towns.map(t => {
                t.name = formatString(t.name, true)
                return t
            })

            var townEmbed = new Discord.MessageEmbed(),
                onlineResidents = [],
                claimBonus = 0

            if (args[0].toLowerCase() == "list") {
                if (args[1] != null) {
                    if (args[1].toLowerCase() == "online") {
                        const onlinePlayers = await Aurora.Players.online().catch(() => {})
                        if (!onlinePlayers) return await m.edit({embeds: [fn.fetchError]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                        var onlineTownData = [], onlineTownDataFinal = []

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
                        onlineTownData.forEach(function (a) {                   
                            // If town doesnt exist, add it.
                            if (!this[a.name]) {           
                                a.onlineResidents = a.residentNames.filter(resident => onlinePlayers.find(op => resident === op.name))

                                this[a.name] = { 
                                    name: a.name, 
                                    nation: a.nation,
                                    onlineResidents: a.onlineResidents,
                                    onlineResidentAmount: a.onlineResidents.length,
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
                            .setType(Type.Town).setPage(page)
                            .paginate(allData, "```", "```")
                            .editMessage(m)
                    }
                    else if (args[1].toLowerCase() == "residents") {          
                        towns.sort((a, b) => b.residents.length - a.residents.length)           
                    }
                    else if (args[1].toLowerCase() == "chunks" || args[1].toLowerCase() == "land" || args[1].toLowerCase() == "area") {
                        towns.sort((a, b) => b.area - a.area)
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
                        var foundNation = towns.find(town => town.nation.toLowerCase() == args[1].toLowerCase())
                        
                        if (!foundNation) towns = fn.defaultSort(towns)
                        else {
                            // Set towns array to the filtered array (only towns that are in the specified nation)
                            towns = towns.filter(town => town.nation.toLowerCase() == args[1].toLowerCase())
                            
                            if (args[2] != null) {
                                if (args[2].toLowerCase() == "area" || args[2].toLowerCase() == "chunks") {
                                    towns.sort((a, b) => {
                                        if (b.area > a.area) return 1
                                        if (b.area < a.area) return -1
                                    })
                                }
                                else if (args[2].toLowerCase() == "residents") {
                                    towns.sort((a, b) => {
                                        if (b.residents.length > a.residents.length) return 1
                                        if (b.residents.length < a.residents.length) return -1
                                    })
                                }
                                else if (args[2].toLowerCase() == "alphabetical" || args[2].toLowerCase() == "name") {
                                    towns.sort((a, b) => {
                                        if (b.name.toLowerCase() < a.name.toLowerCase()) return 1
                                        if (b.name.toLowerCase() > a.name.toLowerCase()) return -1
                                    })
                                }
                            }
                            else towns = fn.defaultSort(towns)
                        }
                    }
                }

                sendList(client, m, args[1], towns)
            }
            else if (args[0].toLowerCase() == "activity" && args[1] != null) {
                var town = towns.find(t => t.name.toLowerCase() == args[1].toLowerCase())

                if (!town) return m.edit({embeds: [
                    new Discord.MessageEmbed()
                    .setTitle("Invalid town name!")
                    .setDescription(args[1] + " doesn't seem to be a valid town name, please try again.")
                    .setTimestamp().setColor("RED")
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
                            if (foundPlayerA.lastOnline === foundPlayerB.lastOnline.aurora) return 0 // identical? return 0 
                            else if (foundPlayerA.lastOnline === null) return 1 // a is null? last 
                            else if (foundPlayerB.lastOnline === null) return -1 // b is null? last

                            const dateB = fn.unixFromDate(foundPlayerB.lastOnline.aurora),
                                  dateA = fn.unixFromDate(foundPlayerA.lastOnline.aurora)

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

                    const townColours = await Aurora.Towns.get(town.name).then(t => t.colourCodes),
                          colour = !townColours ? "GREEN" : townColours.fill.replace('#', '0x')

                    new CustomEmbed(client, "Town Info | Activity in " + town.name)
                        .setColor(colour)
                        .setType(Type.Town).setPage(page)
                        .paginate(allData)
                        .editMessage(m)
                }).catch(() => {})
            }
            else if (args.length > 3 || args.length == null || args[0] == null) {
                return await m.edit({embeds: [
                    new Discord.MessageEmbed()
                    .setDescription("Invalid arguments! Usage: `/t townName` or `/t list`")
                    .setFooter(fn.devsFooter(client))
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setTimestamp()
                    .setColor("RED")
                ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
            }
            else { // /t <town>
                const town = towns.find(t => t.name.toLowerCase() == args[0].toLowerCase())

                if (!town) return m.edit({embeds: [
                    new Discord.MessageEmbed()
                    .setTitle("Invalid town name!")
                    .setDescription(args[0] + " doesn't seem to be a valid town name, please try again.")
                    .setTimestamp().setColor("RED")
                ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                towns = fn.defaultSort(towns)

                const townName = town.name
                const townRank = (towns.findIndex(t => t.name == townName)) + 1,
                      mayor = town.mayor.replace(/_/g, "\\_")
                
                const townColours = await Aurora.Towns.get(townName).then(t => t.colourCodes),
                      colour = !townColours ? "GREEN" : townColours.fill.replace('#', '0x')
                    
                townEmbed.setColor(town.ruined ? "ORANGE" : colour)
                         .setTitle(("Town Info | " + townName + `${town.capital ? " :star:" : ""}`) + (town.ruined ? " (Ruin)" : " | #" + townRank))
                         .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                
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

                    const nationString = !townNation?.discord || townNation.discord == "" 
                        ? town.nation : "[" + townNation.name + "]" + "(" + townNation.discord + ")"

                    townEmbed.addFields(fn.embedField("Nation", nationString, true))
                }

                const multiplier = town.residents.length * 8
                if (town.nation != "No Nation") {
                    const nationBonus = fn.auroraNationBonus(townNation?.residents.length ?? 0)
                    claimBonus = nationBonus + multiplier
                    townEmbed.addFields(fn.embedField("Town Size", 
                        town.area + " / " + Math.min(claimBonus, fn.maxTownSize) + 
                        " [NationBonus: " + nationBonus + "]"
                    ))
                }
                else {
                    townEmbed.addFields(fn.embedField("Town Size", town.area + " / " + Math.min(multiplier, fn.maxTownSize)))
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
                        if (townResidentsLength <= 50) townEmbed.addField("Residents " + `[` + townResidentsLength + `]`, "```" +  town.residents.join(", ") + "```")      
                        else townEmbed.addFields(fn.embedField("Residents", townResidentsLength.toString()))
                    } 
                    else townEmbed.addFields(fn.embedField("Residents", "There are no residents in this town?"))

                    // ONLINE RESIDENTS
                    const townyData = await database.Aurora.getOnlinePlayerData()

                    if (!townyData) townEmbed.addFields(fn.embedField("Online Residents", "No residents are online in " + town.name))
                    else {
                        onlineResidents = fn.removeDuplicates(town.residents.filter(resident => townyData.players.find(op => resident === op.account)))
                        const onlineResidentsString = onlineResidents.toString().replace(/,/g, ", ")

                        if (onlineResidents.length > 0) 
                            townEmbed.addFields(fn.embedField("Online Residents [" + onlineResidents.length + "]", "```" + onlineResidentsString + "```"))
                        else townEmbed.addFields(fn.embedField("Online Residents", "No residents are online in " + town.name))
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

function extractTownData(towns) {
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

async function sendList(client, msg, comparator, towns) {
    towns = fn.defaultSort(towns)
    const page = comparator ?? 0
                    
    const townData = extractTownData(towns),
          allData = townData.map((town, index) => (index + 1) + ". **" + town.name + " (" + town.nation + ")**\n" + 
                "```Residents: " + town.residentNames.length + 
                "``````Chunks: " + town.area + "```").join('\n').match(/(?:^.*$\n?){1,8}/mg)

    const embed = new CustomEmbed(client, "Town Info | Town List").setType(Type.Town)
        .setPage(page)
        .paginate(allData, "\n")

    await embed.editMessage(msg)
}
