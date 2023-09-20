  const Discord = require("discord.js"),
      fn = require('../../bot/utils/fn'),
      emc = require("earthmc"),
      database = require("../../bot/utils/database"),
      { CustomEmbed, Type } = require("../../bot/objects/CustomEmbed"),
      News = require("../../bot/objects/News")

module.exports = {
    name: "nation",
    description: "Displays info for a nation.",
    aliases: ["n"],
    run: async (client, message, args) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [
            new Discord.MessageEmbed()
            .setTitle("<a:loading:966778243615191110> Fetching nation data, this might take a moment.")
            .setColor("AQUA")]
        }).catch(() => {})
        
        if (!req) return await m.edit({embeds: [
            new Discord.MessageEmbed()
            .setColor("RED")
            .setTitle("No Arguments Given")
            .setDescription("To see nation usage, type `/help` and locate 'Nation Commands'")]
        }).then(m => m.delete({timeout: 10000})).catch(() => {})

        const nationEmbed = new Discord.MessageEmbed()
            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
            .setTimestamp()
        
        const townsWithDuplicates = [],
              nationsWithoutDuplicates = []
        
        database.Nova.getNations().then(async nations => { 
            if (!nations) nations = await emc.Nova.Nations.all().catch(err => console.log(err))

            nations = nations.map(n => {
                n.name = emc.formatString(n.name, true)
                return n
            })

            if (args[0].toLowerCase() == "list") {
                if (args[1] != null) {
                    if (args[1].toLowerCase() == "online") {         
                        const onlinePlayers = await emc.Nova.Players.online().catch(() => {})
                        if (!onlinePlayers) return await m.edit(fn.fetchError).then(m => m.delete({timeout: 10000})).catch(() => {})

                        database.Nova.getTowns().then(async towns => {
                            if (!towns) towns = await emc.Nova.Towns.all()
                            
                            let i = 0
                            const len = towns.length
                            for (; i < len; i++) {
                                const cur = towns[i],
                                      nationName = cur.nation

                                if (nationName == "No Nation") continue
                                else {                                          
                                    var townData = {
                                        name: cur.name,
                                        nation: nationName,
                                        residents: cur.residents.length,
                                        residentNames: cur.residents,
                                        onlineResidents: [],
                                        chunks: cur.area
                                    }

                                    townsWithDuplicates.push(townData)
                                }
                            }
                            
                            // Function to get rid of duplicates and add up residents and chunks.
                            townsWithDuplicates.forEach(town => {                             
                                if (!this[town.nation]) {        
                                    const onlineResidents = town.residentNames.filter(resident => onlinePlayers.find(op => resident === op.name || resident.includes(op.name)))
                                    
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
                                this[town.nation].onlineResidents = this[town.nation].residentNames.filter(resident => onlinePlayers.find(op => resident === op.name || resident.includes(op.name)))
                                this[town.nation].chunks += town.chunks                            
                                
                            }, Object.create(null))

                            let page = 1

                            if (args[2] != null) if (req.split(" ")[2]) page = parseInt(req.split(" ")[2])
                            else if (req.split(" ")[1]) page = parseInt(req.split(" ")[1])

                            if (isNaN(page)) page = 0        
                            else page--

                            nationsWithoutDuplicates.sort((a, b) => b.onlineResidents.length - a.onlineResidents.length)

                            const allData = nationsWithoutDuplicates
                                .map(nation => nation.nation + " - " + nation.onlineResidents.length)
                                .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                            new CustomEmbed(client, `(Nova) Nation Info | Online Residents`)
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setType(Type.Nation).setPage(page)
                                .paginate(allData, "```", "```")
                                .editMessage(m)
                        }) 
                    }
                    else if (args[1].toLowerCase() == "residents") 
                        nations.sort(function(a, b) { return b.residents.length - a.residents.length }) 
                    else if (args[1].toLowerCase() == "chunks" || args[1].toLowerCase() == "land" || args[1].toLowerCase() == "area") 
                        nations.sort(function(a, b) { return b.area - a.area })
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

                        new CustomEmbed(client, `(Nova) Nation Info | Nation List`)
                            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                            .setType(Type.Nation).setPage(page)
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

                    new CustomEmbed(client, `(Nova) Nation Info | Nation List`)
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                        .setType(Type.Nation).setPage(page)
                        .paginate(allData, "```", "```")
                        .editMessage(m)
                }
            }
            else if (args[0].toLowerCase() == "activity" && args[1] != null) {
                const nation = nations.find(n => n.name.toLowerCase() == args[1].toLowerCase())

                if (!nation) {
                    nationEmbed.setTitle("Invalid Nation")
                                .setDescription(args[0] + " is not a valid nation, please try again.")
                                .setColor("RED")

                    return m.edit(nationEmbed).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                }

                database.getPlayers().then(async players => {
                    if (!players) return await m.edit({embeds: [fn.databaseError]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                    // Sort by highest offline duration
                    nation.residents.sort((a, b) => {
                        const foundPlayerA = players.find(p => p.name == a),
                              foundPlayerB = players.find(p => p.name == b)

                        if (foundPlayerA && !foundPlayerB) return -1
                        if (!foundPlayerA && foundPlayerB) return 1

                        if (foundPlayerA && foundPlayerB) {
                            if (foundPlayerA.lastOnline.nova === foundPlayerB.lastOnline.nova) return 0 // identical? return 0 
                            else if (foundPlayerA.lastOnline.nova === null) return 1 // a is null? last 
                            else if (foundPlayerB.lastOnline.nova === null) return -1 // b is null? last

                            const dateB = fn.unixFromDate(foundPlayerB.lastOnline.nova),
                                  dateA = fn.unixFromDate(foundPlayerA.lastOnline.nova)

                            return dateB - dateA
                        }
                    })

                    let page = 1
                    if (isNaN(page)) page = 0
                    else page--

                    const allData = nation.residents.map(resident => {
                        const residentInPlayers = players.find(p => p.name == resident)

                        if (residentInPlayers && residentInPlayers.lastOnline.nova != null)
                            return "``" + resident + "`` - " + `<t:${fn.unixFromDate(residentInPlayers.lastOnline.nova)}:R>`

                        return "" + resident + " | Unknown"
                    }).join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    new CustomEmbed(client, `(Nova) Nation Info | Activity in ${nation.name}`)
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                        .setType(Type.Nation).setPage(page)
                        .paginate(allData)
                        .editMessage(m)
                })
            }
            else if (args[0].toLowerCase() == "invitable") {
                const nation = nations.find(n => n.name.toLowerCase() == args[1].toLowerCase())

                if (!nation) {
                    nationEmbed.setTitle("Invalid Nation")
                                .setDescription(args[0] + " is not a valid nation, please try again.")
                                .setColor("RED")

                    return m.edit(nationEmbed).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                }

                let page = 1
                if (isNaN(page)) page = 0
                else page--

                const invitableTowns = await emc.Nova.Towns.invitable(nation.name),
                      allData = invitableTowns.map(t => { return t.name }).join('\n').match(/(?:^.*$\n?){1,10}/mg)                

                new CustomEmbed(client, `(Nova) Nation Info | Towns invitable to ${nation.name}`)
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setType(Type.Nation).setPage(page)
                    .paginate(allData, "```", "```")
                    .editMessage(m)
            }
            else if (args[0].toLowerCase() == "allies") {
                database.Nova.getAlliances().then(async alliances => {
                    if (!alliances) return await m.edit({embeds: [fn.databaseError]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                    const nation = nations.find(n => n.name.toLowerCase() == args[1].toLowerCase())

                    if (!nation) {
                        nationEmbed.setTitle("Invalid Nation")
                                   .setDescription(args[1] + " is not a valid nation, please try again.")
                                   .setColor("RED")
                    
                        return m.edit(nationEmbed).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
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
                                   .setColor("RED")

                        return m.edit({embeds: [nationEmbed]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                    }

                    let page = 1
                    if (isNaN(page)) page = 0        
                    else page--

                    const allData = allies.join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    new CustomEmbed(client, `(Nova) Nation Info | ${nation.name} Allies`)
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                        .setType(Type.Nation).setPage(page)
                        .paginate(allData, "```", "```")
                        .editMessage(m)
                })
            }
            else { // /n <nation>
                nations = nations.map(n => {
                    n.name = emc.formatString(n.name, true)
                    return n
                })

                const nation = nations.find(n => n.name.toLowerCase() == args[0].toLowerCase())

                if (!nation) {
                    nationEmbed.setTitle("Invalid Nation")
                               .setDescription(args[0] + " is not a valid nation, please try again.")
                               .setColor("RED")

                    return m.edit({embeds: [nationEmbed]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                }

                const capitalColours = await emc.Nova.Towns.get(nation.capital.name).then(t => t.colourCodes).catch(() => {}),
                      colour = capitalColours ? capitalColours.fill.replace('#', '0x') : "AQUA"

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
                    : nationResLength >= 10 ? "Federation of " + nation.name : "Land of " + nation.name
                //#endregion

                nations = fn.defaultSort(nations)

                var nationRank = (nations.findIndex(n => n.name == nation.name)) + 1,
                    kingPrefix = nation.kingPrefix ? nation.kingPrefix + " " : nationLeaderPrefix
                    
                //#region Embed Stuff
                if (nation.discord) nationEmbed.setURL(nation.discord)

                nationEmbed.setTitle("Nation Info | " + nationName + " | #" + nationRank)
                           .setThumbnail(nation.flag ? nation.flag : 'attachment://nova.png')
                           .addField("King", kingPrefix + nation.king.replace(/_/g, "\\_"), true)
                           .addField("Capital", nation.capital.name, true)
                           .addField("Location", "[" + nation.capital.x + ", " + nation.capital.z + "]" + 
                                     "(https://earthmc.net/map/nova/?worldname=earth&mapname=flat&zoom=6&x=" + nation.capital.x + "&y=64&z=" + nation.capital.z + ")")
                           .addField("Chunks", nation.area.toString(), true)
                           .addField("Residents", nationResLength.toString(), true)
                           .addField("Nation Bonus", fn.novaNationBonus(nationResLength).toString())

                const onlinePlayers = await emc.Nova.Players.online().catch(() => {})
                if (!onlinePlayers) return await m.edit(fn.fetchError).then(m => m.delete({timeout: 10000})).catch(() => {})

                // Filter nation residents by which are online
                const onlineNationResidents = fn.removeDuplicates(nation.residents.filter(resident => onlinePlayers.find(op => resident == op.name)))
                    
                if (onlineNationResidents.length >= 1)
                    nationEmbed.addField("Online Residents [" + onlineNationResidents.length + "]", "```" + onlineNationResidents.join(", ") + "```")
                //#endregion

                //#region Recent news logic
                var newsChannel = client.channels.cache.get(fn.NOVA.newsChannel),
                    newsChannelMessages = await newsChannel?.messages.fetch().catch(() => {})

                const contains = (str, str2) => str.toLowerCase().includes(str2.toLowerCase())
                const filterNews = msg => contains(msg.content, nation.name.replace(/_/g, " ") || nation.name)

                // Get news descriptions that include the nation name, then sort by most recent.
                var filteredMessages = newsChannelMessages?.filter(msg => filterNews(msg)),
                    mostRecentDate = new Date(Math.max.apply(null, filteredMessages?.map(e => new Date(e.createdTimestamp))))

                const recentNews = filteredMessages?.find(e => { 
                    const d = new Date(e.createdTimestamp)
                    return d.getTime() == mostRecentDate.getTime()
                })
                //#endregion
                
                database.Nova.getAlliances().then(alliances => {
                    if (alliances) {
                        const nationAlliances = alliances
                            .filter(alliance => alliance.nations.map(e => e.toLowerCase())
                            .includes(nation.name.toLowerCase())).map(a => a.allianceName)

                        if (nationAlliances.length >= 1)
                            nationEmbed.addField("Alliances [" + nationAlliances.length + "]", "```" + nationAlliances.join(", ") + "```")
                    }

                    const nationTownsString = nation.towns.join(", ").toString().replace(/^\s+|\s+$/gm, "")
                    nationEmbed.addField("Towns [" + nation.towns.length + "]", "```" + nationTownsString + "```")
                    
                    if (recentNews) {
                        const news = new News(recentNews),
                              img = news.images[0]

                        nationEmbed.addFields(fn.embedField(
                            "Recent News",
                            news.message + (img ? " ([Image](" + img + "))" : "")
                        ))
                    }

                    nationEmbed.setFooter(fn.devsFooter(client))

                    const thumbnail = nation.flag ? [] : [fn.NOVA.thumbnail]
                    return m.edit({embeds: [nationEmbed], files: thumbnail})
                })
            }
        })
    }
}

