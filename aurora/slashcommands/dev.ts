import Discord from "discord.js"

import { Service } from 'koyeb.js'
import * as fn from '../../bot/utils/fn.js'

import dotenv from 'dotenv'
dotenv.config()

const serviceID = "32ed6d7c-e2b2-4ddd-bd40-f574e154fc0a"

export default {
    name: "dev",
    disabled: false,
    description: "Developer restricted commands for bot management.",
    run: async (client: Discord.Client, interaction: Discord.ChatInputCommandInteraction) => {
        const service = new Service(serviceID, process.env.AUTH_TOKEN),
              embed = new Discord.EmbedBuilder()

        const member = interaction.member as Discord.GuildMember

        if (!fn.botDevs.includes(member.id)) {
            try {
                const m = interaction.reply({embeds: [
                    embed.setTitle("Goofy ah :skull:")
                    .setColor(Discord.Colors.Red)
                    .setTimestamp()
                    .setAuthor({ 
                        name: interaction.user.username, 
                        iconURL: interaction.user.displayAvatarURL() 
                    })
                ]})
                
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTimeout(() => (m as any).delete(), 10000)
                return
            }
            catch(_) { /* empty */ } 
        }

        switch(interaction.options.getSubcommand().toLowerCase()) {
            case "restart": {
                await interaction.reply({embeds: [embed
                    .setColor(Discord.Colors.Blue)
                    .setTitle(":repeat: Re-deploying the bot service..")
                ]})

                return await service.redeploy()
            }
            case "resume": {
                await interaction.reply({embeds: [embed
                    .setColor(Discord.Colors.Green)
                    .setTitle(":white_check_mark: Bot service resumed.")
                ]})

                return await service.resume()
            }
            case "pause": {
                const paused = await service.pause()
                if (!paused) return await interaction.reply({embeds: [embed
                    .setColor(Discord.Colors.Red)
                    .setTitle("An error occurred while trying to pause the service!")
                ]})

                return await interaction.reply({embeds: [embed
                    .setColor(Discord.Colors.Gold)
                    .setTitle(":pause_button: Bot service paused.")
                ]})
            }
            case "purge": {
                const guildsToLeave = await client.guilds.cache.map(g => g.id)
                let leaveCounter = 0
                
                await interaction.deferReply()

                guildsToLeave.forEach(async id => {
                    const guild = await client.guilds.fetch(id)
                    if (guild.memberCount < 5) {
                        const left = await guild.leave().then(() => true)
                        if (left) leaveCounter++
                    }
                })

                return await interaction.editReply({ content: `Left ${leaveCounter} guilds.` })
            }
            default: return await interaction.reply({embeds: [embed
                .setColor(Discord.Colors.Red)
                .setTitle("Invalid Arguments")
                .setDescription("Arguments: `pause`, `resume`, `restart`")
            ], ephemeral: true })
        }
    }, data: new Discord.SlashCommandBuilder().setName("dev")
        .setDescription("Manage bot services.")
        .addSubcommand(subCmd => subCmd.setName('restart').setDescription('Automatically redeploy the bot service.'))
        .addSubcommand(subCmd => subCmd.setName('pause').setDescription('Pause the bot service.'))
        .addSubcommand(subCmd => subCmd.setName('resume').setDescription('Resume the bot service.'))
        .addSubcommand(subCmd => subCmd.setName('purge').setDescription('Leaves all guilds with 4 or less members.'))
}