const Discord = require('discord.js'),
    fn = require('../../bot/utils/fn'),
    { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
    name: "location",
    description: "Converts 2 coordinates into a clickable map link.",
    /**
     * @param {Discord.Client} client 
     * @param {Discord.CommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        const get = interaction.options.getInteger
        const xcoord = get("x"), 
              zcoord = get("z"), 
              zoom = get("zoom")
      
        if (!xcoord || !zcoord || isNaN(xcoord) || isNaN(zcoord)) {
            return interaction.reply({embeds: [new Discord.MessageEmbed()
                .setColor("RED")
                .setTitle("Error while using /location:")
                .setDescription("Invalid arguments!\n\nUsage: `/loc xcoord zcoord`")
                .setFooter(fn.devsFooter(client)).setTimestamp()
            ], ephemeral: true})
        } else if (Number(xcoord) >= 33081 || Number(xcoord) < -33280 || Number(zcoord) >= 16508 || Number(zcoord) < -16640) {
            return interaction.reply({embeds: [new Discord.MessageEmbed()
                .setTitle("Error while using /location:")
                .setColor("RED")
                .setDescription("Please enter 2 values that are inside EarthMC's world border.")
                .setFooter(fn.devsFooter(client)).setTimestamp()
            ], ephemeral: true})
        }
        else {
            const dynmapLink = `[Click here](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=${zoom ?? 4}&x=${xcoord}&y=64&z=${zcoord})`
            const embed = new Discord.MessageEmbed()
                .setColor("GREEN")
                .setTitle("Map location for X:" + xcoord + ", Z:" + zcoord)
                .addFields(fn.embedField("Dynmap Link", dynmapLink))
                .setFooter(fn.devsFooter(client))
                .setTimestamp()

            if (zoom) embed.addField("Zoom", zoom.toString() + 'x')
            if (!isNaN(zoom) && Number(zoom) < 11) return interaction.reply({embeds: [embed]})
            else interaction.reply({embeds: [new Discord.MessageEmbed()
                .setTitle("Error while using /location:")
                .setColor("RED")
                .setDescription("`" + zoom + "`" + " is not a valid zoom! Please use a number from 1-10.")
                .setFooter(fn.devsFooter(client)).setTimestamp()
            ], ephemeral: true })
        }
    }, data: new SlashCommandBuilder()
        .setName("location")
        .setDescription("Converts 2 coordinates into a clickable map link.")
        .addIntegerOption(option => option.setName("x").setDescription("The x coordinate.").setRequired(true))
        .addIntegerOption(option => option.setName("z").setDescription("The z coordinate.").setRequired(true))
        .addIntegerOption(option => option.setName("zoom").setDescription("The amount of zoom to use."))
}