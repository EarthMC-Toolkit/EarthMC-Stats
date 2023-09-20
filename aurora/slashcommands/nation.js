const Discord = require("discord.js"),
      fn = require('../../bot/utils/fn'),
      emc = require("earthmc"),
      { SlashCommandBuilder } = require('@discordjs/builders'),
      database = require("../../bot/utils/database"),
      { CustomEmbed, Type } = require("../../bot/objects/CustomEmbed"),
      News = require("../../bot/objects/News")

module.exports = {
    name: "nation",
    description: "Displays info for a nation.",
    run: async (client, interaction) => {
        var nationEmbed = new Discord.MessageEmbed().setColor("AQUA").setTimestamp()
        
        if (!interaction.options.getSubcommand()) {
            return await interaction.reply({embeds: [
                new Discord.MessageEmbed()
                    .setColor("RED")
                    .setTitle("No Arguments Given")
                    .setDescription("To see nation usage, type `/help` and locate 'Nation Commands'")
            ], ephemeral: true})
        }

        await interaction.deferReply()

        var townsWithDuplicates = [],
            nationsWithoutDuplicates = []
        
        database.Aurora.getNations().then(async nations => {
            if (!nations) nations = await emc.Aurora.Nations.all().catch(err => console.log(err))

            if (interaction.options.getSubcommand() == "list") {
                let comparator = interaction.options.getString("comparator")

                if (comparator != null) {
                    comparator = comparator.toLowerCase()

                    if (comparator == "online") {         
                        const onlinePlayers = await emc.Aurora.Players.online().catch(() => {})
                        if (!onlinePlayers) return await interaction.editReply({embeds: [fn.fetchError]})
                            .then(() => setTimeout(() => interaction.deleteReply(), 10000)).catch(() => {})

                        database.Aurora.getTowns().then(async towns => {
                            if (!towns) towns = await emc.Aurora.Towns.all()

                            const len = towns.length
                            for (let i = 0; i < len; i++) {
                                const cur = towns[i],
                                      nationName = cur.nation

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
                            
                            // Function to get rid of duplicates and add up residents and chunks.
                            townsWithDuplicates.forEach(town => {                             
                                if (!this[town.nation]) {        
                                    const onlineResidents = town.residentNames.filter(resident => 
                                        onlinePlayers.find(op => resident === op.name || resident.includes(op.name)))
                                    
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
                                    onlinePlayers.find(op => resident === op.name || resident.includes(op.name)))

                                this[town.nation].chunks += town.chunks                            
                                
                            }, Object.create(null))

                            nationsWithoutDuplicates.sort((a, b) => b.onlineResidents.length - a.onlineResidents.length)
                            const allData = nationsWithoutDuplicates
                                .map(nation => nation.nation + " - " + nation.onlineResidents.length)                                     
                                .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                            new CustomEmbed(client, `Nation Info | Online Residents`)
                                .setType(Type.Nation)
                                .paginate(allData, "```", "```")
                                .editInteraction(interaction)
                        })
                    }
                    else if (comparator == "residents") nations.sort((a, b) => b.residents.length - a.residents.length)  
                    else if (comparator == "chunks" || comparator == "land" || comparator == "area") nations.sort((a, b) => b.area - a.area)
                    else if (comparator == "alphabetical" || comparator == "name") {
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

                    if (comparator != "online") {
                        const allData = nations
                            .map(nation => nation.name + " - Residents: " + nation.residents.length + " | Chunks: " + nation.area)
                            .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                        new CustomEmbed(client, `Nation Info | Nation List`)
                            .setType(Type.Nation)
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
                        .setType(Type.Nation)
                        .paginate(allData, "```", "```")
                        .editInteraction(interaction)
                }
            }
            else if (interaction.options.getSubcommand() == "activity" && interaction.options.getString("name") != null) {
                var nation = nations.find(n => n.name.toLowerCase() == interaction.options.getString("name").toLowerCase())

                if (!nation) {
                    nationEmbed.setTitle("Invalid Nation")
                    nationEmbed.setDescription(interaction.options.getString("name") + " is not a valid nation, please try again.")
                    nationEmbed.setColor("RED")

                    return interaction.editReply({embeds: [nationEmbed]})
                }

                database.getPlayers().then(async players => {
                    if (!players) return await interaction.editReply({embeds: [fn.databaseError]}).then(() => setTimeout(() => interaction.deleteReply(), 10000))

                    // Sort by highest offline duration
                    nation.residents.sort((a, b) => {
                        const foundPlayerA = players.find(p => p.name == a),
                              foundPlayerB = players.find(p => p.name == b)

                        if (foundPlayerA && !foundPlayerB) return -1
                        if (!foundPlayerA && foundPlayerB) return 1

                        if (foundPlayerA && foundPlayerB) {
                            const loA = foundPlayerA.lastOnline,
                                  loB = foundPlayerB.lastOnline

                            // Identical? don't sort.
                            if (loA.aurora === loB.aurora) return 0 
                            if (!loA) return 1
                            if (!loB) return -1

                            const dateB = fn.unixFromDate(loB.aurora),
                                  dateA = fn.unixFromDate(loA.aurora)

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
                        .setType(Type.Nation)
                        .paginate(allData)
                        .editInteraction(interaction)
                })
            } // /n <nation>
            else if (interaction.options.getSubcommand() == "lookup" && interaction.options.getString("name") != null) {
                const nation = nations.find(n => n.name.toLowerCase() == interaction.options.getString("name").toLowerCase())
                if (!nation) {
                    nationEmbed.setTitle("Invalid Nation")
                    nationEmbed.setDescription(interaction.options.getString("name") + " is not a valid nation, please try again.")
                    nationEmbed.setColor("RED")

                    return interaction.editReply({embeds: [nationEmbed]})
                }
                
                const capitalColours = await emc.Aurora.Towns.get(nation.capital.name).then(t => t.colourCodes).catch(() => {}),
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
                    : nationResLength >= 10 ? "Federation of " + nation.name
                    : "Land of " + nation.name
                //#endregion

                nations = fn.defaultSort(nations)

                var nationRank = (nations.findIndex(n => n.name == nation.name)) + 1,
                    kingPrefix = nation.kingPrefix ? nation.kingPrefix + " " : nationLeaderPrefix

                //#region Embed Stuff
                if (nation.discord) nationEmbed.setURL(nation.discord)

                nationEmbed.setTitle("Nation Info | " + nationName + " | #" + nationRank)
                           .setThumbnail(nation.flag ? nation.flag : 'attachment://aurora.png')
                           .addField("King", kingPrefix + nation.king.replace(/_/g, "\\_"), true)
                           .addField("Capital", nation.capital.name, true)
                           .addField("Location", "[" + nation.capital.x + ", " + nation.capital.z + "]" + 
                                        "(https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=6&x=" + nation.capital.x + "&y=64&z=" + nation.capital.z + ")")
                           .addField("Chunks", nation.area.toString(), true)
                           .addField("Residents", nationResLength.toString(), true)
                           .setFooter(fn.devsFooter(client))
                           .addField("Nation Bonus", fn.auroraNationBonus(nationResLength).toString())

                const onlinePlayers = await emc.Aurora.Players.online().catch(() => {})
                if (onlinePlayers) {
                    // Filter nation residents by which are online
                    const onlineNationResidents = fn.removeDuplicates(nation.residents.filter(resident => onlinePlayers.find(op => resident == op.name)))
                    
                    nationEmbed.addFields(fn.embedField(
                        "Online Residents [" + onlineNationResidents.length + "]", 
                        "```" + onlineNationResidents.join(", ") + "```"
                    ))
                }
                //#endregion

                //#region Recent news logic
                var newsChannel = client.channels.cache.get(fn.AURORA.newsChannel),
                    newsChannelMessages = await newsChannel?.messages.fetch()

                const filterNews = msg => msg.content.toLowerCase().includes(nation.name.replace(/_/g, " ").toLowerCase() || nation.name.toLowerCase())

                // Get news descriptions that include the nation name
                // Then sort/get most recent description
                const filteredMessages = newsChannelMessages?.filter(msg => filterNews(msg)),
                      mostRecentDate = new Date(Math.max.apply(null, filteredMessages?.map(e => new Date(e.createdTimestamp))))

                const recentNews = filteredMessages?.find(e => { 
                    const d = new Date(e.createdTimestamp)
                    return d.getTime() == mostRecentDate.getTime()
                })
                //#endregion
                
                database.Aurora.getAlliances().then(async alliances => {
                    if (alliances) {
                        const nationAlliances = alliances
                            .filter(alliance => alliance.nations.map(e => e.toLowerCase())
                            .includes(nation.name.toLowerCase())).map(a => a.allianceName) 

                        if (nationAlliances?.length > 0)
                            nationEmbed.addField("Alliances [" + nationAlliances.length + "]", "```" + nationAlliances.join(", ") + "```")
                    }

                    const nationTownsString = nation.towns.join(", ").toString().replace(/^\s+|\s+$/gm, "")
                    nationEmbed.addField("Towns [" + nation.towns.length + "]", "```" + nationTownsString + "```")
                    
                    if (recentNews) {
                        const news = new News(recentNews)
                        nationEmbed.addField("Recent News", news.message + (news?.images[0] ? " ([Image](" + news.images[0] + "))" : ""))
                    }
                    
                    const thumbnail = nation.flag ? [] : [fn.AURORA.thumbnail] 
                    interaction.editReply({embeds: [nationEmbed], files: thumbnail})
                })
            }
        })
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