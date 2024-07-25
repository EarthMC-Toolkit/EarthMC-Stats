import { 
    type Client, type Message, 
    EmbedBuilder, Colors
} from "discord.js"

export default {
    name: "nation",
    description: "Displays info for a nation.",
    slashCommand: true,
    aliases: ["n"],
    run: async (_client: Client, message: Message, _args: string[]) => {
        return message.reply({embeds: [new EmbedBuilder()
            .setTitle("Command Deprecated")
            .setTitle("This command no longer exists. Use the **nation** slash commands instead.")
            .setColor(Colors.Orange)
        ]}).then(m => setTimeout(() => m.delete(), 5000)).catch(() => {}) 
    }
}