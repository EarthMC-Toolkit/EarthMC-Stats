const Discord = require("discord.js"),
      fn = require('../../bot/utils/fn'),
      { Aurora } = require('earthmc')

module.exports = {
    name: "townless",
    slashCommand: true,
    description: "Lists all online players without a town.",
    run: async (client, message, args) => {
        var req = args.join(" "),
            m = await message.reply({embeds: [new Discord.MessageEmbed()
                .setColor("DARK_PURPLE")
                .setTitle("<a:loading:966778243615191110> Fetching townless players, this may take a moment.")]})   
                
        const townlessPlayers = await Aurora.Players.townless().catch(() => {}) 
        if (!townlessPlayers) return await m.edit(fn.fetchError).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        let page = 1    

        if (req.split(" ")[0]) page = parseInt(req.split(" ")[0])
        if (isNaN(page)) page = 0
        else page--

        const allData = townlessPlayers.map(player => player.name)
            .join('\n').match(/(?:^.*$\n?){1,10}/mg)
        
        const botembed = []
        let i = 0
            
        const len = allData.length
        const townlessPlayersLen = townlessPlayers.length

        const embed = new Discord.MessageEmbed()
            .setTitle("(Aurora) Townless Players [" + townlessPlayersLen + "]")
            .setColor("DARK_PURPLE")
            .setTimestamp()
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL() 
            })

        if (townlessPlayersLen < 1) {
            const noTownlessEmbed = embed.setDescription("There are currently no townless players!")
            return m.edit(noTownlessEmbed).then(m => m.delete({ timeout: 10000 })).catch(() => {})
        }
        else if (len <= 1) { // If only one page, don't create paginator.
            return m.edit({ embeds: 
                [embed.setDescription("```" + townlessPlayers[0].name + "\n" + allData.toString() + "```")]
            })
        }
        else { // More than one page, create paginator.
            for (; i < len; i++) {
                botembed[i] = embed.setDescription(
                    "```" + townlessPlayers[0].name + "\n" + allData[i] + "```"
                ).setFooter({ 
                    text: `Page ${i+1}/${len}`, 
                    iconURL: client.user.avatarURL() 
                })
            }

            await m.edit({ embeds: [botembed[page]] })
                .then(msg => fn.paginator(message.author.id, msg, botembed, page))
                .catch(err => console.log(err))
        }
    }
}