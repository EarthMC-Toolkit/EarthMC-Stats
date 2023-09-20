const Discord = require("discord.js"), 
      fn = require('../../bot/utils/fn')

module.exports = {
    name: "stats",
    description: "Sends bot-related statistics",
    /**
     * @param { Discord.Client } client 
     * @param { Discord.CommandInteraction } interaction 
     */
    run: async (client, interaction) => {    
        return interaction.reply({embeds: [new Discord.MessageEmbed()
            .setColor("GREEN")
            .setTitle("Bot Statistics")
            .setThumbnail(client.user.avatarURL())
            .addFields(
                fn.embedField("Total Servers: ", client.guilds.cache.size.toString(), true),
                fn.embedField("Total Users: ", fn.getUserCount(client).toString(), true)
            )
            .setTimestamp()
            .setFooter(fn.devsFooter(client))
        ]})
    }
}