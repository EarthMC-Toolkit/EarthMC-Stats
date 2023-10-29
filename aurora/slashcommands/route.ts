import type { Client, ChatInputCommandInteraction } from "discord.js"
import { Aurora } from "earthmc"

export default {
    name: "route",
    description: "",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const x = interaction.options.getString("x")
        const z = interaction.options.getString("z")
        
        const gps = Aurora.GPS.findRoute()
    }
}