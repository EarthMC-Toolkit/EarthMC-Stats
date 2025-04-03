import {
    type Client,
    type ButtonInteraction
} from "discord.js"

import type { Button } from "../../bot/types.js"

const exportBtn: Button = {
    id: "export",
    execute: (_: Client, interaction: ButtonInteraction) => {
        return interaction.reply({
            content: "Your exported content is attached below.",
            ephemeral: true,
            files: []
        })
    }
}

export default exportBtn