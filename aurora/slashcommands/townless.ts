import Discord from "discord.js"


import * as fn from '../../bot/utils/fn.js'
import { Aurora } from 'earthmc'

export default {
    name: "townless",
    description: "Lists all online players without a town.",
    run: async (client: Discord.Client, interaction: Discord.CommandInteraction) => {
        const townlessPlayers = await Aurora.Players.townless().catch(() => null) 
        if (!townlessPlayers) return await interaction.reply({embeds: [fn.fetchError], ephemeral: true})

        const page = 0,
              allData = townlessPlayers.map(player => player.name).join('\n').match(/(?:^.*$\n?){1,10}/mg),
              botembed = []
            
        const townlessLen = townlessPlayers.length,
              len = allData.length

        if (townlessLen < 1) {
            return interaction.reply({embeds: [new Discord.EmbedBuilder()
                .setColor(Discord.Colors.DarkPurple)
                .setTitle("Townless Players [0]")
                .setDescription("There are currently no townless players!")
                .setTimestamp()], ephemeral: true})
        }
        else if (len <= 1) { // If only one page, don't create paginator.   
            return interaction.reply({embeds: [new Discord.EmbedBuilder()
                .setColor(Discord.Colors.DarkPurple)
                .setTitle("Townless Players [" + townlessLen + "]")
                .setDescription("```" + townlessPlayers[0].name + "\n" + allData.toString() + "```")
                .setTimestamp()
            ]})
        }
        else { // More than one page, create paginator.
            for (let i = 0; i < len; i++) {
                botembed[i] = new Discord.EmbedBuilder()
                .setColor(Discord.Colors.DarkPurple)
                .setTitle("Townless Players [" + townlessLen + "]")
                .setDescription("```" + townlessPlayers[0].name + "\n" + allData[i] + "```")
                .setTimestamp()
                .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
            }

            await interaction.reply({embeds: [botembed[page]]})
                .then(() => fn.paginatorInteraction(interaction, botembed, page))
                .catch(console.log)
        }
    }, data: new Discord.SlashCommandBuilder()
        .setName("townless")
        .setDescription("Lists all online townless players.")
}