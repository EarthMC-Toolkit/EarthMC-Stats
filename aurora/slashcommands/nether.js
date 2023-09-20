const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn'),
      { SlashCommandBuilder } = require('@discordjs/builders')

const formatCoord = coord => coord.toString().replace(/[, ]/g, " ")
const convertToOverworld = coord => Math.floor(coord / 8).toString()

module.exports = {
    name: "nether",
    description: "Converts 2 coordinates into nether coordinates.",
    /**
     * @param {Discord.Client} client 
     * @param {Discord.CommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        const errorEmbed = new Discord.MessageEmbed()
            .setDescription("<:red_tick:1036290475012915270> Please enter 2 numerical arguments, divided by a space or comma.")
            .setColor("RED")
            .setTimestamp()
            .setFooter(fn.devsFooter(client))

        const x = interaction.options.getInteger("x"),
              z = interaction.options.getInteger("z")

        if (!x || !z) return interaction.reply({ embeds: [errorEmbed], ephemeral: true })

        const replacedArgs = [formatCoord(x), z.toString().replace(/[, ]/g, " ")]
        
        const arg0 = Number(replacedArgs[0])
        const arg1 = Number(replacedArgs[1])

        if (isNaN(arg0) || isNaN(arg1))
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true })

        return interaction.reply({embeds: [new Discord.MessageEmbed()
            .setTitle(`Nether coords for ${replacedArgs.join(", ").toString().replace(/ , /g, ", ")}`)
            .setColor("GREEN")
            .setDescription(`\n${convertToOverworld(arg0)}, ${convertToOverworld(arg1)}`)
            .setTimestamp()
            .setFooter(fn.devsFooter(client))
        ]})
    }, data: new SlashCommandBuilder()
        .setName("nether")
        .setDescription("Converts 2 coordinates into nether coordinates.")
        .addIntegerOption(option => option.setName("x").setDescription("The x overworld coordinate.").setRequired(true))
        .addIntegerOption(option => option.setName("z").setDescription("The z overworld coordinate.").setRequired(true))
}