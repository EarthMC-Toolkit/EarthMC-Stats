import {
    Client,
    ChatInputCommandInteraction
} from "discord.js"

import { Button } from "../../bot/types.js"

const exportBtn: Button = {
    id: "export",
    execute: (_: Client, interaction: ChatInputCommandInteraction, args: any[]) => {
        const fileContent = args[0]
        
        return interaction.reply({ 
            content: "```" + fileContent + "```",
            ephemeral: true,
            files: []
        })
    }
}

export default exportBtn