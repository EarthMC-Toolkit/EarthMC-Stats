import { 
    Client, ChatInputCommandInteraction,
    GuildMember, Colors, EmbedBuilder,
    SlashCommandBuilder
} from "discord.js"

import { Service } from 'koyeb.js'
import * as fn from '../../bot/utils/fn.js'

import dotenv from 'dotenv'
dotenv.config()

const serviceID = "32ed6d7c-e2b2-4ddd-bd40-f574e154fc0a"

export default {
    name: "dev",
    disabled: false,
    description: "Developer restricted commands for bot management.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const service = new Service(serviceID, process.env.AUTH_TOKEN),
              embed = new EmbedBuilder()

        const member = interaction.member as GuildMember

        if (!fn.botDevs.includes(member.id)) {
            try {
                const m = await interaction.reply({embeds: [
                    embed.setTitle("Goofy ah :skull:")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setAuthor({ 
                        name: interaction.user.username, 
                        iconURL: interaction.user.displayAvatarURL() 
                    })
                ]})
            
                setTimeout(() => m.delete(), 10000)
                return
            }
            catch(_) { /* empty */ } 
        }

        switch(interaction.options.getSubcommand().toLowerCase()) {
            case "restart": {
                await interaction.reply({embeds: [embed
                    .setColor(Colors.Blue)
                    .setTitle(":repeat: Re-deploying the bot service..")
                ]})

                return await service.redeploy()
            }
            case "resume": {
                await interaction.reply({embeds: [embed
                    .setColor(Colors.Green)
                    .setTitle(":white_check_mark: Bot service resumed.")
                ]})

                return await service.resume()
            }
            case "pause": {
                const paused = await service.pause()
                if (!paused) return await interaction.reply({embeds: [embed
                    .setColor(Colors.Red)
                    .setTitle("An error occurred while trying to pause the service!")
                ]})

                return await interaction.reply({embeds: [embed
                    .setColor(Colors.Gold)
                    .setTitle(":pause_button: Bot service paused.")
                ]})
            }
            case "purge": {
                await interaction.deferReply()

                const guildsToLeave = client.guilds.cache.filter(g => g.memberCount < 5).map(g => g.id)
                let leaveCounter = 0

                guildsToLeave.forEach(async id => {
                    const guild = await client.guilds.fetch(id)
                    const left = await guild.leave().then(() => true).catch(console.log)
                    if (left) leaveCounter++
                })

                return await interaction.editReply({ content: `Left ${leaveCounter} guilds.` })
            }
            default: return await interaction.reply({embeds: [embed
                .setColor(Colors.Red)
                .setTitle("Invalid Arguments")
                .setDescription("Arguments: `pause`, `resume`, `restart`")
            ], ephemeral: true })
        }
    }, data: new SlashCommandBuilder().setName("dev")
        .setDescription("Manage bot services.")
        .addSubcommand(subCmd => subCmd.setName('restart').setDescription('Automatically redeploy the bot service.'))
        .addSubcommand(subCmd => subCmd.setName('pause').setDescription('Pause the bot service.'))
        .addSubcommand(subCmd => subCmd.setName('resume').setDescription('Resume the bot service.'))
        .addSubcommand(subCmd => subCmd.setName('purge').setDescription('Leaves all guilds with 4 or less members.'))
}