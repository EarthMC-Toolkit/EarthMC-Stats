import * as fn from '../../bot/utils/fn.js'

import { ResidentHelper } from '../../common/resident.js'
import { MessageCommand } from '../../bot/types.js'

import { 
    Colors, 
    Client, 
    Message, 
    EmbedBuilder 
} from "discord.js"

const errEmbed = (client: Client, msg: Message) => new EmbedBuilder()
    .setColor(Colors.Red)
    .setFooter(fn.devsFooter(client))
    .setAuthor({ 
        name: msg.author.username, 
        iconURL: msg.author.displayAvatarURL() 
    })

const resCmd: MessageCommand = {
    name: "resident",
    description: "Displays info for a specific resident.",
    slashCommand: true,
    aliases: ["res", "player"],
    run: async (client: Client, message: Message, args) => {    
        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching resident data, this might take a moment.")
            .setColor(Colors.DarkPurple)
        ]})
        
        //#region Pre-check errors to prevent unnecessary calls.
        if (!req) return m.edit({embeds: [errEmbed(client, message)
            .setTitle("Invalid Arguments!")
            .setDescription("Usage: `/res playerName`")
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const input = req.replaceAll(' ', '')
        const inputLen = input.length

        if (inputLen > 16 || inputLen < 3) return m.edit({embeds: [errEmbed(client, message)
            .setTitle(`Illegal character amount`)
            .setDescription(`Usernames must be between 3 and 16 characters.`)
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        //#endregion

        const resHelper = new ResidentHelper(client)
        const exists = await resHelper.init(args)

        if (!exists || !resHelper.apiResident) {
            return m.edit({embeds: [errEmbed(client, message)
                .setTitle(`${req} isn't a registered player name, please try again.`)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }

        await resHelper.setupEmbed()
        return await m.edit({ embeds: [resHelper.embed] })
    }
}

export default resCmd