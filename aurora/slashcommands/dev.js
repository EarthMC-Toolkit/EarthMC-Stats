const Discord = require("discord.js"),
      { SlashCommandBuilder } = require('@discordjs/builders'),
      serviceID = "32ed6d7c-e2b2-4ddd-bd40-f574e154fc0a",
      Koyeb = require('koyeb.js'),
      fn = require('../../bot/utils/fn.js')

require('dotenv').config()

module.exports = {
    name: "dev",
    disabled: false,
    description: "Developer restricted commands for bot management.",
    /**
     * 
     * @param { Discord.Client } client 
     * @param { Discord.CommandInteraction } interaction 
     * @returns 
     */
    run: async (client, interaction) => {
        const service = new Koyeb.Service(serviceID, process.env.AUTH_TOKEN),
              embed = new Discord.MessageEmbed()

        if (!fn.botDevs.includes(interaction.member.id)) {
            return interaction.reply({embeds: [
                embed.setTitle("Goofy ah :skull:")
                .setColor("RED")
                .setTimestamp()
                .setAuthor({ 
                    name: interaction.user.username, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }

        switch(interaction.options.getSubcommand().toLowerCase()) {
            case "restart": {
                await interaction.reply({embeds: [embed
                    .setColor("BLUE")
                    .setTitle(":repeat: Re-deploying the bot service..")
                ]})

                return await service.redeploy()
            }
            case "resume": {
                await interaction.reply({embeds: [embed
                    .setColor("GREEN")
                    .setTitle(":white_check_mark: Bot service resumed.")
                ]})

                return await service.resume()
            }
            case "pause": {
                const paused = await service.pause()
                if (!paused) return await interaction.reply({embeds: [embed
                    .setColor("RED")
                    .setTitle("An error occurred while trying to pause the service!")
                ]})

                return await interaction.reply({embeds: [embed
                    .setColor("GOLD")
                    .setTitle(":pause_button: Bot service paused.")
                ]})
            }
            default: return await interaction.reply({embeds: [embed
                .setColor("RED")
                .setTitle("Invalid Arguments")
                .setDescription("Arguments: `pause`, `resume`, `restart`")
            ], ephemeral: true })
        }
    }, data: new SlashCommandBuilder().setName("dev")
        .setDescription("Manage bot services.")
        .addSubcommand(subCmd => subCmd.setName('restart').setDescription('Automatically redeploy the bot service.'))
        .addSubcommand(subCmd => subCmd.setName('pause').setDescription('Pause the bot service.'))
        .addSubcommand(subCmd => subCmd.setName('resume').setDescription('Resume the bot service.'))
}