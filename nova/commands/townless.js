const Discord = require("discord.js"),
      fn = require('../../bot/utils/fn'),
      emc = require('earthmc')

module.exports = {
    name: "townless",
    description: "Lists all online players without a town.",
    run: async (client, message, args) => {
        var m = await message.reply({embeds: [new Discord.MessageEmbed()
            .setColor("DARK_PURPLE")
            .setTitle("<a:loading:966778243615191110> Fetching townless players, this may take a moment.")]}),
            req = args.join(" ")
                
        const townlessPlayers = await emc.Nova.Players.townless().catch(() => {}) 
        if (!townlessPlayers) return await m.edit(fn.fetchError).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        let i = 0, page = 1   

        if (req.split(" ")[0]) page = parseInt(req.split(" ")[0])
        if (isNaN(page)) page = 0
        else page--

        const allData = townlessPlayers.map(p => p.name).join('\n').match(/(?:^.*$\n?){1,10}/mg)
        const botembed = []
        
        if (townlessPlayers.length < 1) {
            const noTownlessEmbed = new Discord.MessageEmbed()
                .setColor("DARK_PURPLE")
                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                .setTitle("(Nova) Townless Players [0]")
                .setDescription("There are currently no townless players!")
                .setTimestamp()
    
            return m.edit(noTownlessEmbed).then(m => m.delete({timeout: 10000})).catch(() => {})
        }
        else if (allData.length <= 1) { // If only one page, don't create paginator.
            return m.edit({embeds: [
                new Discord.MessageEmbed()
                .setColor("DARK_PURPLE")
                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                .setTitle("(Nova) Townless Players [" + townlessPlayers.length + "]")
                .setDescription("```" + townlessPlayers[0].name + "\n" + allData.toString() + "```")
                .setTimestamp()
            ]})
        }
        else { // More than one page, create paginator.
            for (i = 0; i < allData.length; i++) {
                botembed[i] = new Discord.MessageEmbed()
                .setColor("DARK_PURPLE")
                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                .setTitle("(Nova) Townless Players [" + townlessPlayers.length + "]")
                .setDescription("```" + townlessPlayers[0].name + "\n" + allData[i] + "```")
                .setTimestamp()
                .setFooter({text: `Page ${i+1}/${allData.length}`, iconURL: client.user.avatarURL()})
            }

            await m.edit({embeds: [botembed[page]]}).then(msg => fn.paginator(message.author.id, msg, botembed, page)).catch(err => console.log(err))
        }
    }
}