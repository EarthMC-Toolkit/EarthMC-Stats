const Discord = require("discord.js"),
      db = require("../../bot/utils/database"),
      fn = require('../../bot/utils/fn'),
      striptags = require('striptags'),
      { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
    name: "playerposition",
    description: "Get a players current location.",
    /**
     * 
     * @param { Discord.Client } client 
     * @param { Discord.CommandInteraction } interaction 
     * @returns 
     */
	run: async (client, interaction) => {
        const player = interaction.options.getString("player")
          
        if (!player) {
            return interaction.reply({embeds: [
                new Discord.MessageEmbed()
                .setColor("RED")
                .setTitle("Error while using /playerposition:")
                .setDescription("Not enough arguments, please provide a valid playername.")
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
            ], ephemeral: true})
        }

        const townydata = await db.Aurora.getOnlinePlayerData()
        if (!townydata) return interaction.reply({embeds: [ 
            new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("RED")
                .setTitle("Connection Issues")
                .setAuthor({name: interaction.user.username, iconURL: interaction.user.displayAvatarURL()})
                .setDescription("Unable to fetch Towny data, the server may be down for maintenance.\n\nPlease try again later.")
                .setFooter(fn.devsFooter(client))]
        }).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        const onlinePlayers = townydata.players,
              foundPlayer = onlinePlayers.find(op => op.account.toLowerCase() == player.toLowerCase())
          
        if (foundPlayer && !fn.botDevs.includes(player.toLowerCase())) {
            if (foundPlayer.world == "-some-other-bogus-world-") {
                return interaction.reply({embeds: [
                    new Discord.MessageEmbed()
                        .setTitle("Location Unavailable")
                        .setDescription(foundPlayer.account + " seems to be invisible, under a block, or in the nether. Please try again later.")
                        .setColor("DARK_GOLD")
                        .setTimestamp()
                ], ephemeral: true})
            } else {
                const locationEmbed = new Discord.MessageEmbed()
                    .setTitle("Location Info | " + foundPlayer.account)
                    .setThumbnail("https://crafatar.com/avatars/" + foundPlayer.account + "/256.png")
                    .setColor("DARK_VIVID_PINK")
                    .setTimestamp()
                    .setFooter(fn.devsFooter(client))
                      
                const foundPlayerNickname = striptags(foundPlayer.name)
                      
                if (foundPlayer.account !== foundPlayerNickname)
                    locationEmbed.addFields(fn.embedField("Nickname", foundPlayerNickname))
                
                locationEmbed.addField("Coordinates", "X: " + foundPlayer.x + "\nY: " + (foundPlayer.y - 1) + "\nZ: " + foundPlayer.z)
                locationEmbed.addField("Dynmap Link", "[" + foundPlayer.x + ", " + foundPlayer.z + "]" + "(https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=6&x=" + foundPlayer.x + "&y=64&z=" + foundPlayer.z + ")")

                return interaction.reply({embeds: [locationEmbed]}).catch(() => {})
            }
        } else {
            return interaction.reply({embeds: [
                new Discord.MessageEmbed()
                    .setTitle("Error fetching player")
                    .setDescription(player + " isn't online or does not exist!")
                    .setTimestamp()
                    .setColor("RED")
            ], ephemeral: true})
        }
    }, data: new SlashCommandBuilder()
        .setName("playerposition")
        .setDescription("Get a players current location.")
        .addStringOption(option => option.setName("player").setDescription("The player to get the location for.").setRequired(true))
}
