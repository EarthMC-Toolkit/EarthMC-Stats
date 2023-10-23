import Discord from "discord.js" 
import * as fn from'../../bot/utils/fn.js'

export default {
    name: "stats",
    description: "Sends bot-related statistics",
    run: async (client: Discord.Client , interaction: Discord.CommandInteraction) => {    
        return interaction.reply({embeds: [new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Green)
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