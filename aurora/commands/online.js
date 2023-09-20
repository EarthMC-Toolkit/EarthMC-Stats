const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn'),
      { Aurora } = require("earthmc")

const sortByKey = (arr, key) => {
    arr.sort(function(a, b) {
        if (a[key].toLowerCase() < b[key].toLowerCase()) return -1
        if (a[key].toLowerCase() > b[key].toLowerCase()) return 1
        return 0
    })
}

module.exports = {
    name: "online",
    slashCommand: true,
    run: async (client, message, args) => {
        var req = args.join(" "),
            m = await message.reply({embeds: [new Discord.MessageEmbed()
                .setTitle("<a:loading:966778243615191110> Fetching activity data, this might take a moment.")
                .setColor(0x556b2f)]
            })

        if (!req) return m.edit({embeds: [
              new Discord.MessageEmbed()
              .setColor("RED")
              .setTitle("No Arguments Given")
              .setDescription("Arguments: `all`, `staff`/`mods`, `mayors`, `kings`")
        ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        const onlinePlayers = await Aurora.Players.online().catch(err => console.log(err))
        if (!onlinePlayers) return await m.edit({embeds: [fn.fetchError]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        const embed = () => new Discord.MessageEmbed()
            .setColor(0x556b2f)
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setTimestamp()
            .setFooter(fn.devsFooter(client))

        switch(args[0].toLowerCase()) {
            case "all": {
                // Alphabetical sort
                sortByKey(onlinePlayers, 'name')

                let i = 0, page = 1
                if (isNaN(page)) page = 0
                else page--

                const allData = onlinePlayers.map(op => op.name != op.nickname 
                    ? op.name + " (" + op.nickname + ")" : op.name)
                .join('\n').match(/(?:^.*$\n?){1,20}/mg)

                const botembed = []
                const len = allData.length

                for (; i < len; i++) {
                    botembed[i] = embed()
                    .setTitle("(Aurora) Online Activity | All")
                    .setDescription("```" + allData[i] + "```")
                    .setFooter({text: `Page ${i + 1}/${len}`, iconURL: client.user.avatarURL()})
                }

                return await m.edit({embeds: [botembed[page]]}).then(msg => fn.paginator(message.author.id, msg, botembed, page))
            }
            case "staff":
            case "mods": {
                const onlineStaff = fn.staff.all().filter(sm => onlinePlayers.find(op => op.name.toLowerCase() == sm.toLowerCase()))
                return m.edit({embeds: [new embed()
                    .setTitle("(Aurora) Online Activity | Staff")
                    .setDescription(onlineStaff.length >= 1 ? "```" + onlineStaff.join(", ").toString() + "```" : "No staff are online right now! Try again later.")
                ]})
            }
            case "mayors": {
                const towns = await Aurora.Towns.all().then(arr =>
                    arr.filter(t => onlinePlayers.find(op => op.name == t.mayor)))
                
                if (!towns) return
                sortByKey(towns, 'mayor')
            
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
                    .setTitle("(Aurora) Online Activity | Mayors")
                    .setDescription("Total: " + towns.length + "```" + allData[i] + "```")
                    .setTimestamp()
                    .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
                }
                    
                return await m.edit({embeds: [botembed[page]]}).then(msg => fn.paginator(message.author.id, msg, botembed, page))
            }
            case "kings": {
                const nations = await Aurora.Nations.all().then(arr =>
                    arr.filter(n => onlinePlayers.find(op => op.name == n.king)))

                if (!nations) return
                sortByKey(nations, 'king')
            
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
                    .setTitle("(Aurora) Online Activity | Kings")
                    .setDescription("Total: " + nations.length + "```" + allData[i] + "```")
                    .setTimestamp()
                    .setFooter({text: `Page ${i + 1}/${len}`, iconURL: client.user.avatarURL()})
                }
                    
                return await m.edit({embeds: [botembed[page]]}).then(msg => fn.paginator(message.author.id, msg, botembed, page))
            }
            default: return await m.edit({embeds: [
                new Discord.MessageEmbed()
                .setColor("RED")
                .setTitle("Invalid Arguments")
                .setDescription("Arguments: `all`, `staff`, `mayors`, `kings`")
            ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
        }
    }
}