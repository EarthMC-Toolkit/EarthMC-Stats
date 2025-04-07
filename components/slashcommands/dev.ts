import { 
    type Client, 
    type ChatInputCommandInteraction, 
    type GuildMember, 
    Colors, EmbedBuilder,
    SlashCommandBuilder,
    AttachmentBuilder
} from "discord.js"

import { backtick, botDevs } from '../../bot/utils/fn.js'
//import { getPlayers, setPlayers } from "../../bot/utils/database.js"

import { cache } from "../../bot/constants.js"
import { Aurora } from "../../bot/utils/database.js"
import { request } from "undici"

// import dotenv from 'dotenv'
// dotenv.config()

//const serviceID = "32ed6d7c-e2b2-4ddd-bd40-f574e154fc0a"

const leftEmbed = new EmbedBuilder()
    .setTitle("Notice of Departure")
    .setColor("#d64b00")

const slashCmdData = new SlashCommandBuilder().setName("dev")
    .setDescription("Manage bot services.")
    //.addSubcommand(subCmd => subCmd.setName('restart').setDescription('Automatically redeploy the bot service.'))
    //.addSubcommand(subCmd => subCmd.setName('pause').setDescription('Pause the bot service.'))
    //.addSubcommand(subCmd => subCmd.setName('resume').setDescription('Resume the bot service.'))
    //.addSubcommand(subCmd => subCmd.setName('fixonline').setDescription('Fixes errors in DB player entries.'))
    .addSubcommand(subCmd => subCmd.setName('clearcache')
        .setDescription('Empties the cache so it will regenerate. May fix potential issues.')
    )
    .addSubcommand(subCmd => subCmd.setName('backup_alliances')
        .setDescription('Creates and sends a backup (JSON file) of all alliances currently in the database.')
    )
    .addSubcommand(subCmd => subCmd.setName('rebuild_alliances')
        .setDescription('Recreates all alliances (that dont yet exist) from based 3merald cache.')
        .addAttachmentOption(opt => opt.setName("cache_file")
            .setDescription("The cache file to use for rebuilding alliances.")
            .setRequired(true)
        )
    )
    .addSubcommand(subCmd => subCmd.setName('purge')
        .setDescription('Leaves all guilds with the specified amount of members or less.')
        .addIntegerOption(opt => opt.setName("purge_threshold")
            .setDescription("The member count threshold at which to leave guilds at or below.")
            .setMinValue(2)
            .setMaxValue(10)
        )
    )

interface CachedAlliance {
    name: string
    type: "alliances" | "meganations" // Doesn't matter for now
    nations: string[]
    colours: {
        fill: string
        outline: string
    }
}

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
                
                await client.guilds.fetch()
                const guilds = client.guilds.cache.values()

                let leftAmt = 0
                for (const guild of guilds) {
                    try {
                        const members = await guild.members.list()
                        const humanCount = members.filter(m => !m.user.bot).size

                        if (humanCount > purgeThreshold) continue

                        await guild.leave()
                        leftAmt++
                    } catch(e) {
                        console.error(`Error leaving guild: ${guild.name}.\n${e.message}`)
                        continue
                    }

                    const guildOwner = await guild.fetchOwner()
                    if (!guildOwner) continue

                    leftEmbed.setDescription(`
                        Due to low member count, I have left this server: ${backtick(guild.name)}
                        This was done for the following reasons:
                        - To combat abuse, where the goal is to intentionally overwhelm the database.\n
                        - To prevent hitting the 2500 shard limit until truly necessary to avoid major refactoring and downtime.
                        
                        It is recommended you use the bot in more established servers like [EMC Toolkit Development](https://discord.gg/yyKkZfmFAK).
                        Sorry for the inconvenience!
                    `)

                    await guildOwner.send({ embeds: [leftEmbed] })
                }

                return await interaction.editReply({ content: `Left ${leftAmt} guilds.` })
            }
            // case "fixonline": {
            //     let fixedPlayersAmt = 0

            //     const dbPlayers = await getPlayers(true)
            //     const toRemove = []

            //     for (const player of dbPlayers) {
            //         if (!player.lastOnline) {
            //             toRemove.push(player.name)
            //             fixedPlayersAmt++

            //             continue
            //         }

            //         delete player.lastOnline['nova']
            //         delete player.linkedID

            //         const badAurora = player.lastOnline['Aurora']
            //         if (badAurora) {
            //             player.lastOnline.aurora = badAurora
            //             delete player.lastOnline['Aurora']
            //         }

            //         const missingOnlineDates = !player.lastOnline.aurora
            //         if (missingOnlineDates) {
            //             toRemove.push(player.name)
            //         }

            //         if (missingOnlineDates || badAurora) {
            //             fixedPlayersAmt++
            //         }
            //     }

            //     await setPlayers(dbPlayers.filter(p => !toRemove.includes(p.name)))

            //     return await interaction.editReply({ content: `Corrected DB errors for ${fixedPlayersAmt} players.` })
            // }
            case "clearcache": {
                await interaction.deferReply()

                cache.clear()

                return await interaction.editReply({ content: `Cache has been cleared.` })
            }
            case "backup_alliances": {
                await interaction.deferReply()

                const alliances = await Aurora.getAlliances(true)
                if (!alliances) return await interaction.reply({
                    content: `Failed to fetch alliances.`,
                    ephemeral: true
                })

                const json = JSON.stringify(alliances, null, 2) // Pretty print with 2 spaces
                const buf = Buffer.from(json)

                const file = new AttachmentBuilder(buf, { 
                    name: `alliances-${new Date().toISOString()}.json` 
                })

                return await interaction.followUp({
                    content: `Successfully created a backup of alliances.`,
                    files: [file]
                })
            }
            case "rebuild_alliances": {
                await interaction.deferReply()

                const inputFile = await interaction.options.getAttachment("cache_file")
                if (!inputFile) return await interaction.editReply({ content: `Something went wrong with the input file.` })

                const cachedAlliances = (await request(inputFile.url).then(res => res.body.json())) as CachedAlliance[]
                if (!cachedAlliances || cachedAlliances.length < 0) {
                    return await interaction.editReply({ content: `Failed to parse JSON.` })
                }

                await interaction.editReply({ content: `Found ${cachedAlliances.length} alliances in JSON.` })

                const alliances = await Aurora.getAlliances(true)
                if (!alliances) return await interaction.reply({
                    content: `Failed to fetch alliances.`,
                    ephemeral: true
                })

                const skip = [
                    "HRE", "Holy Roman Empire", 
                    "OFN", "Organization of Free Nations", 
                    "RSAA", "Realm of South Africa and Antartica",
                    "UAA", "United Aurora Accord",
                    "RSA", "Realm of South Africa",
                    "Uzbek", "Federation Of Uzbekistan",
                    "ALC", "American Liberty Coalition",
                    "Africa"
                ]
                
                for (const cachedAlliance of cachedAlliances) {
                    if (skip.some(s => s.toLowerCase() == cachedAlliance.name.toLowerCase())) continue
                    if (alliances.some(a => a.fullName.toLowerCase() == cachedAlliance.name.toLowerCase())) continue

                    // Exists already


                    // Doesn't exist already
                    alliances.push({
                        allianceName: cachedAlliance.name.replaceAll(" ", "_"),
                        fullName: cachedAlliance.name,
                        type: "normal",
                        nations: cachedAlliance.nations,
                        leaderName: "None",
                        colours: cachedAlliance.colours
                    })
                }

                await Aurora.setAlliances(alliances)
                return await interaction.followUp({ content: `Successfully rebuilt alliances.` })
            }
            default: return await interaction.reply({embeds: [embed
                .setColor(Colors.Red)
                .setTitle("Invalid Arguments")
                .setDescription("Arguments: `pause`, `resume`, `restart`")
            ], ephemeral: true })
        }
    }
}