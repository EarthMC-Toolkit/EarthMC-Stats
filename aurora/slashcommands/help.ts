import Discord from "discord.js"

export default {
    name: "help",
    description: "Sends you the bot's commands.",
    run: async (_: Discord.Client, interaction: Discord.ChatInputCommandInteraction) => {
        switch(interaction.options.getSubcommand().toLowerCase()) {
            case "main": {
                return await interaction.reply({embeds: [
                    new Discord.EmbedBuilder()
                    .setColor(Discord.Colors.Green)
                    .setTitle("Main Commands")
                    .setDescription(
                        "**Useful**\n" +
                        "`/queue` | See what the current state of the queue looks like.\n" +
                        "`/townless` | Displays the names of online players who are not in a town.\n" +
                        "`/resident <player>` | Displays information on the specified resident.\n" +
                        "`/playerposition <player>` | Get the current coordinates of the specified player.\n\n" +
                        "**Town**\n" +
                        "`/town lookup <town>` | Shows information about the specified town. \n" + 
                        "`/town list` | Displays a list of towns according to highest resident and chunk count.\n" + 
                        "`/town list <comparator>` | Sorts the list of towns by specified comparator: `online`, `residents`, `chunks`, `name`, & `nation`.\n\n" +
                        "**Nation**\n" +
                        "`/nation lookup <nation>` | Shows information about the specified nation.\n" +
                        "`/nation list` | Displays a list of nations according to both residents and chunks.\n" +
                        "`/n list <comparator>` | Sorts the list of nations by specified comparator: `online`, `residents`, `chunks`, `name`, & `nation`.\n"
                    )
                ]})
            }
            case "alliance": {
                return await interaction.reply({embeds: [
                    new Discord.EmbedBuilder()
                    .setColor(Discord.Colors.Green)
                    .setTitle("Alliance Commands")
                    .setDescription(
                        "`/alliance <name>` | Get info on the specified alliance.\n" +
                        "`/alliance list` or  `/alliances` | Displays a list of all alliances.\n" +
                        "`/alliances search <key>` | Displays a list of matching query of alliances.\n"
                    )
                ]})
            }
            case "other": {
                return await interaction.reply({embeds: [
                    new Discord.EmbedBuilder()
                    .setColor(Discord.Colors.Green)
                    .setTitle("Other Commands")
                    .setDescription(
                        "**Miscellaneous**\n" +
                        "`/staff list` | Displays a list of all the staff members.\n" +
                        "`/staff online` | Displays a list of online staff members.\n" +
                        "`/online <option>` | Shows online players. Options are as following: `all`, `staff`/`mods`, `mayors`, `kings`.\n" +
                        "`/nether <xCoord> <zCoord>` | Get a quick conversion of overworld to nether coordinates.\n" +
                        "`/location <xCoord> <zCoord> <zoom>(optional)` | Quickly jump to a position on the dynmap.\n" +
                        "**Bot Related**\n" +
                        "`/help <type>` | Shows bot's specified type of commands: `main`, `alliance`, `other`\n" +
                        "`/stats` | Shows amount of unique people the bot can reach and how many servers it's in." + "\n"
                    )
                ]})
            }
            default:
                return await interaction.reply({embeds: [
                    new Discord.EmbedBuilder()
                    .setColor(Discord.Colors.Red)
                    .setTitle("Invalid Arguments")
                    .setDescription("Arguments: `main`, `alliance`, `other`")
                ], ephemeral: true})
        }
    }, data: new Discord.SlashCommandBuilder()
        .setName("help")
        .setDescription("Sends you the bot's commands.")
        .addSubcommand(subcommand => subcommand.setName('main').setDescription('Lists main bot commands.'))
        .addSubcommand(subcommand => subcommand.setName('alliance').setDescription('Lists alliance bot commands.'))
        .addSubcommand(subcommand => subcommand.setName('other').setDescription('Lists all other bot commands.'))
}