import {
    type Client, 
    type ChatInputCommandInteraction,
    EmbedBuilder, SlashCommandBuilder, Colors
} from "discord.js"

import { paginatorInteraction } from "../../bot/utils/fn.js"

const slashCmdData = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Outputs all commands (and aliases) with descriptions, sorted into different pages.")

export default {
    name: "help",
    description: "Sends you the bot's commands.",
    data: slashCmdData,
    run: async (_: Client, interaction: ChatInputCommandInteraction) => {
        const main = new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle("Main Commands")
            .setDescription(
                "**Useful**\n" +
                "`/queue` | See what the current state of the queue looks like.\n" +
                "`/townless` | Displays the names of online players who are not in a town.\n" +
                "`/resident <player>` | Displays information on the specified resident.\n" +
                "`/playerposition <player>` | Get the current coordinates of the specified player.\n"
            )

        const alliance = new EmbedBuilder()
            .setColor(Colors.DarkBlue)
            .setTitle("Alliance Commands")
            .setDescription(
                "**Single**\n" +
                "`/alliance <name>` or `/a <name>` | Get info on the specified alliance.\n" +
                "`/alliance score <name>` | Outputs the alliance's score using EMCS tailored weights.\n" +
                "`/alliance online <name>` | Displays a list of online players in this alliance.\n\n" +
                "**Multiple**\n" +
                "`/alliance list`, `/a list` or `/alliances` | Displays a list of all alliances.\n" +
                "`/alliances search <key>` | Displays a list of matching query of alliances.\n" +
                "`/pacts` | Displays a list of alliances that are only normal/regular alliances.\n" +
                "`/meganations` | Displays a list of alliances that have sub-meganations and/or nations.\n" +
                "`/submeganations` | Displays a list of alliances that are a part of a meganation.\n"
            )
        
        const other = new EmbedBuilder()
            .setColor(Colors.Purple)
            .setTitle("Other Commands")
            .setDescription(
                "**Miscellaneous**\n" +
                "`/staff list` | Displays a list of all the staff members.\n" +
                "`/staff online` | Displays a list of online staff members.\n" +
                "`/online <option>` | Shows online players. Options are as following: `all`, `staff`/`mods`, `mayors`, `kings`.\n" +
                "`/nether <xCoord> <zCoord>` | Get a quick conversion of overworld to nether coordinates.\n" +
                "`/location <xCoord> <zCoord> <zoom>(optional)` | Quickly jump to a position on the dynmap.\n\n" +
                "**Bot Related**\n" +
                "`/help <type>` | Shows bot's specified type of commands: `main`, `alliance`, `other`.\n" +
                "`/stats` | Shows amount of unique people the bot can reach and how many servers it's in.\n"
            )

        const embeds = [main, alliance, other]
        return await interaction.reply({ embeds: [embeds[0]] })
            .then(() => paginatorInteraction(interaction, embeds, 0))
            .catch(console.error)
    }
}