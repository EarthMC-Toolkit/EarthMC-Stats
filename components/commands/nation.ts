import { 
    type Client, type Message, 
    EmbedBuilder, Colors
} from "discord.js"

import { botDevs, devsFooter } from "../../bot/utils/index.js"
import NationLookup from "../common/lookup/nation.js"

const errEmbed = (client: Client, msg: Message) => new EmbedBuilder()
    .setColor(Colors.Red)
    .setFooter(devsFooter(client))
    .setAuthor({ 
        name: msg.author.username, 
        iconURL: msg.author.displayAvatarURL() 
    })

export default {
    name: "nation",
    description: "Displays info for a nation.",
    //slashCommand: true,
    aliases: ["n"],
    run: async (client: Client, message: Message, args: string[]) => {
        if (!botDevs.includes(message.author.id)) {
            return message.reply({embeds: [new EmbedBuilder()
                .setTitle("Command Deprecated")
                .setTitle("This command no longer exists. Use the **nation** slash commands instead.")
                .setColor(Colors.Orange)
            ]}).then(m => setTimeout(() => m.delete(), 5000)).catch(() => {}) 
        }

        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching nation data, this might take a moment.")
            .setColor(Colors.Aqua)
        ]})

        //#region Pre-check errors to prevent unnecessary calls.
        if (!req) return m.edit({embeds: [errEmbed(client, message)
            .setTitle("Invalid Arguments!")
            .setDescription("Usage: `/nation nationName`")
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        //#endregion

        // TODO: Replace with .trim() instead?
        const input = req.replaceAll(' ', '')

        const nationLookup = new NationLookup(client) 
        const exists = await nationLookup.init(input)
        
        if (!exists) {
            return m.edit({embeds: [errEmbed(client, message)
                .setTitle(`${req} isn't a registered nation, please try again.`)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }

        return await m.edit({
            //files: [nationHelper.getDownloadAttachment()],
            embeds: [nationLookup.createEmbed()]
        })
    }
}