import {
    type Client,
    type ChatInputCommandInteraction
} from "discord.js"

import type { Button } from "../../bot/types.js"

const exportBtn: Button = {
    id: "export",
    execute: (_: Client, interaction: ChatInputCommandInteraction) => {
        return interaction.reply({
            content: "Your exported content is attached below.",
            ephemeral: true,
            files: []
        })
    }
}

export default exportBtn