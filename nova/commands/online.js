const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn'),
      emc = require("earthmc")

module.exports = {
    name: "online",
    run: async (client, message, args) => {
        var m = await message.reply({embeds: [new Discord.MessageEmbed()
            .setTitle("<a:loading:966778243615191110> Fetching activity data, this might take a moment.")
            .setColor(0x556b2f)]}),
            req = args.join(" ")

        if (!req) return m.edit({embeds: [new Discord.MessageEmbed()
              .setColor("RED")
              .setTitle("No Arguments Given")
              .setDescription("Arguments: `all`, `staff`/`mods`, `mayors`, `kings`")
        ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        const onlinePlayers = await emc.Nova.Players.online().catch(() => {})
        if (!onlinePlayers) return await m.edit({embeds: [fn.fetchError]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        switch(args[0].toLowerCase()) {
            case "all": {
                // Alphabetical sort
                onlinePlayers.sort((a, b) => {
                    if (b.name.toLowerCase() < a.name.toLowerCase()) return 1
                    if (b.name.toLowerCase() > a.name.toLowerCase()) return -1

                    return 0
                })

                const allData = onlinePlayers.map(op => op.name != op.nickname ? op.name + " (" + op.nickname + ")" 
                            : op.name).join('\n').match(/(?:^.*$\n?){1,20}/mg)

                const botembed = [], len = allData.length
                let i = 0, page = 1

                if (isNaN(page)) page = 0
                else page--

                for (; i < len; i++) {
                    botembed[i] = new Discord.MessageEmbed()
                    .setColor(0x556b2f)
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setTitle("(Nova) Online Activity | All")
                    .setDescription("```" + allData[i] + "```")
                    .setTimestamp()
                    .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
                }

                return await m.edit({embeds: [botembed[page]]}).then(msg => fn.paginator(message.author.id, msg, botembed, page))
            }
            case "staff":
            case "mods": {
                const onlineStaff = fn.staff.all().filter(sm => onlinePlayers.find(op => op.name.toLowerCase() == sm.toLowerCase()))
                return m.edit({embeds: [
                    new Discord.MessageEmbed()
                    .setTitle("(Nova) Online Activity | Staff")
                    .setDescription(onlineStaff.length >= 1 ? "```" + onlineStaff.join(", ").toString() + "```" : "No staff are online right now! Try again later.")
                    .setColor(0x556b2f)
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setThumbnail(client.user.avatarURL())
                    .setTimestamp()
                    .setFooter(fn.devsFooter(client))
                ]})
            }
            case "mayors": {
                let towns = await emc.Nova.Towns.all().catch(() => {})
                towns = towns.filter(t => onlinePlayers.find(op => op.name == t.mayor))

                towns.sort(function(a, b) {
                    if (a.mayor.toLowerCase() < b.mayor.toLowerCase()) return -1
                    if (a.mayor.toLowerCase() > b.mayor.toLowerCase()) return 1
                    return 0
                })
            
                let i = 0, page = 1
                if (req.split(" ")[0]) page = parseInt(req.split(" ")[0])
                if (isNaN(page)) page = 0
                else page--
            
                const allData = towns.map(town => `${town.mayor} (${town.name})`).join('\n').match(/(?:^.*$\n?){1,20}/mg),
                      botembed = []
                    
                const len = allData.length
                for (; i < len; i++) {
                    botembed[i] = new Discord.MessageEmbed()
                    .setColor(0x556b2f)
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setTitle("(Nova) Online Activity | Mayors")
                    .setDescription("Total: " + towns.length + "```" + allData[i] + "```")
                    .setTimestamp()
                    .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
                }
                    
                return await m.edit({embeds: [botembed[page]]}).then(msg => fn.paginator(message.author.id, msg, botembed, page))
            }
            case "kings": {
                let nations = await emc.Nova.Nations.all().catch(() => {})
                nations = nations.filter(n => onlinePlayers.find(op => op.name == n.king))

                nations.sort(function(a, b) {
                    if (a.king.toLowerCase() < b.king.toLowerCase()) return -1
                    if (a.king.toLowerCase() > b.king.toLowerCase()) return 1
                    return 0
                })
            
                let i = 0, page = 1
                if (req.split(" ")[0]) page = parseInt(req.split(" ")[0])
                if (isNaN(page)) page = 0
                else page--
            
                const allData = nations.map(nation => `${nation.king} (${nation.name})`).join('\n').match(/(?:^.*$\n?){1,20}/mg),
                      botembed = [], 
                      len = allData.length
            
                for (; i < len; i++) {
                    botembed[i] = new Discord.MessageEmbed()
                    .setColor(0x556b2f)
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setTitle("(Nova) Online Activity | Kings")
                    .setDescription("Total: " + nations.length + "```" + allData[i] + "```")
                    .setTimestamp()
                    .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
                }
                    
                return await m.edit({embeds: [botembed[page]]}).then(msg => fn.paginator(message.author.id, msg, botembed, page))
            }
            default: return await m.edit({embeds: [
                new Discord.MessageEmbed()
                .setColor("RED")
                .setTitle("Invalid Arguments")
                .setDescription("Arguments: `all`, `staff`/`mods`, `mayors`, `kings`")
            ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
        }
    }
}