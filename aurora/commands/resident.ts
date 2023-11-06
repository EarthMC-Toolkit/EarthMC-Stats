import * as fn from '../../bot/utils/fn.js'

import { ResidentHelper } from '../../common/resident.js'
import { MessageCommand } from '../../bot/types.js'

import { 
    Colors, 
    EmbedBuilder 
} from "discord.js"

const resCmd: MessageCommand = {
    name: "resident",
    description: "Displays info for a specific resident.",
    slashCommand: true,
    aliases: ["res", "player"],
    run: async (client, message, args) => {    
        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching resident data, this might take a moment.")
            .setColor(Colors.DarkPurple)
        ]})
        
        if (!req) return m.edit({embeds: [new EmbedBuilder()
            .setTitle("Invalid Arguments!")
            .setDescription("Usage: `/res playerName`")
            .setColor(Colors.Red)
            .setFooter(fn.devsFooter(client))
            .setTimestamp()
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const resHelper = new ResidentHelper(client)
        const exists = await resHelper.init(args)

        if (!exists && !resHelper.apiResident) return m.edit({embeds: [new EmbedBuilder()
            .setTitle(`${args[0]} isn't a registered player name, please try again.`)
            .setColor(Colors.Red)
            .setFooter(fn.devsFooter(client))
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setTimestamp()
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        await resHelper.setupEmbed()
        return await m.edit({ embeds: [resHelper.embed] })
    }
}

export default resCmd