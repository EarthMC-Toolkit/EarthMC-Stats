import {
    type Client,
    type ChatInputCommandInteraction
} from "discord.js"

import { Button } from "../../bot/types.js"

const exportBtn: Button = {
    id: "view_all_towns",
    execute: (_: Client, interaction: ChatInputCommandInteraction) => {
        return interaction.reply({ 
            content: "Not yet implemented.",
            ephemeral: true,
            files: []
        })
    }
}

export default exportBtn