import { 
    type Client, 
    type ChatInputCommandInteraction, 
    type GuildMember, 
    Colors, EmbedBuilder,
    SlashCommandBuilder
} from "discord.js"

import { backtick, botDevs } from '../../bot/utils/fn.js'

import dotenv from 'dotenv'
dotenv.config()

//const serviceID = "32ed6d7c-e2b2-4ddd-bd40-f574e154fc0a"

const slashCmdData = new SlashCommandBuilder().setName("dev")
    .setDescription("Manage bot services.")
    //.addSubcommand(subCmd => subCmd.setName('restart').setDescription('Automatically redeploy the bot service.'))
    //.addSubcommand(subCmd => subCmd.setName('pause').setDescription('Pause the bot service.'))
    //.addSubcommand(subCmd => subCmd.setName('resume').setDescription('Resume the bot service.'))
    .addSubcommand(subCmd => subCmd.setName('purge')
        .setDescription('Leaves all guilds with the specified amount of members or less.')
        .addIntegerOption(opt => opt.setName("purge_threshold")
            .setDescription("The member count threshold at which to leave guilds at or below.")
            .setMinValue(2)
            .setMaxValue(10)
        )
    )

export default {
    name: "dev",
    description: "Developer restricted commands for bot management.",
    data: slashCmdData,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        //const service = new Service(serviceID, process.env.AUTH_TOKEN)
        const embed = new EmbedBuilder()
        const member = interaction.member as GuildMember

        if (!botDevs.includes(member.id)) {
            return await interaction.reply({embeds: [embed
                .setTitle("Goofy ah :skull:")
                .setColor(Colors.Red)
                .setTimestamp()
                .setAuthor({ 
                    name: interaction.user.username, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
            ]}).then(m => setTimeout(() => m.delete(), 10000))
        }

        const subCmdName = interaction.options.getSubcommand().toLowerCase()
        switch(subCmdName) {
            // case "restart": {
            //     await interaction.reply({embeds: [embed
            //         .setColor(Colors.Blue)
            //         .setTitle(":repeat: Re-deploying the bot service..")
            //     ]})

            //     return await service.redeploy()
            // }
            // case "resume": {
            //     await interaction.reply({embeds: [embed
            //         .setColor(Colors.Green)
            //         .setTitle(":white_check_mark: Bot service resumed.")
            //     ]})

            //     return await service.resume()
            // }
            // case "pause": {
            //     const paused = await service.pause()
            //     if (!paused) return await interaction.reply({embeds: [embed
            //         .setColor(Colors.Red)
            //         .setTitle("An error occurred while trying to pause the service!")
            //     ]})

            //     return await interaction.reply({embeds: [embed
            //         .setColor(Colors.Gold)
            //         .setTitle(":pause_button: Bot service paused.")
            //     ]})
            // }
            case "purge": {
                await interaction.deferReply()
                const purgeThreshold = interaction.options.getInteger("purge_threshold")

                const guildsToLeave = await client.guilds.cache.filter(g => g.memberCount <= purgeThreshold)
                let leaveCounter = 0

                const leftEmbed = new EmbedBuilder()
                    .setTitle("Notice of Departure")
                    .setColor("#d64b00")

                guildsToLeave.forEach(async guild => {
                    //const guild = await client.guilds.fetch(id)
                    const left = await guild.leave().then(() => true).catch(e => { console.error(e); return false })

                    if (!left) return
                    leaveCounter++

                    const guildOwner = await guild.fetchOwner()
                    if (!guildOwner) return

                    leftEmbed.setDescription(`
                        Due to low member count, I have left this server: ${backtick(guild.name)}
                        This was done for two main reasons:
                        1. To combat abuse, where the goal is to intentionally overwhelm the database.\n
                        2. To prevent hitting the 2500 shard limit until truly necessary to avoid major refactoring and downtime.
                        
                        It is recommended you use the bot in more established servers like [EMC Toolkit Development](https://discord.gg/yyKkZfmFAK).
                        Sorry for the inconvenience!
                    `)

                    await guildOwner.send({ embeds: [leftEmbed] })
                })

                return await interaction.editReply({ content: `Left ${leaveCounter} guilds.` })
            }
            default: return await interaction.reply({embeds: [embed
                .setColor(Colors.Red)
                .setTitle("Invalid Arguments")
                .setDescription("Arguments: `pause`, `resume`, `restart`")
            ], ephemeral: true })
        }
    }
}