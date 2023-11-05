import {
    Client,
    ChatInputCommandInteraction
} from "discord.js"

import { Button } from "../../bot/types.js"

const exportBtn: Button = {
    id: "export",
    execute: (_: Client, interaction: ChatInputCommandInteraction) => {
        //const fileContent = args[0]
        
        return interaction.reply({ 
            content: "Your exported content is attached below.",
            ephemeral: true,
            files: []
        })
    }
}

export default exportBtn