import Discord from "discord.js"

import * as fn from '../../bot/utils/fn.js'
import { ResidentHelper } from '../../common/resident.js'

export default {
    name: "resident",
    description: "Displays info for a specific resident.",
    aliases: ["res", "player"],
    run: async (client: Discord.Client, message: Discord.Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [
            new Discord.EmbedBuilder()
                .setTitle("<a:loading:966778243615191110> Fetching resident data, this might take a moment.")
                .setColor(Discord.Colors.DarkPurple)
        ]})
 
        if (!req) return m.edit({embeds: [
            new Discord.EmbedBuilder()
            .setTitle("Invalid Arguments!")
            .setDescription("Usage: `/res playerName`")
            .setColor(Discord.Colors.Red)
            .setFooter(fn.devsFooter(client))
            .setTimestamp()
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL() 
            })
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const resHelper = new ResidentHelper(client, true)
        await resHelper.init(args)

        // Townless
        if (!resHelper.apiResident) {  
            if (!resHelper.player?.name) {
                return m.edit({embeds: [new Discord.EmbedBuilder()
                    .setTitle(args[0] + " isn't a registered player name, please try again.")
                    .setColor(Discord.Colors.Red)
                    .setFooter(fn.devsFooter(client))
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }

            await resHelper.setupTownlessEmbed()
        }
        else { // Belongs to a town
            await resHelper.setupResidentEmbed()
        }

        return await m.edit({embeds: [resHelper.embed]})
    }
}