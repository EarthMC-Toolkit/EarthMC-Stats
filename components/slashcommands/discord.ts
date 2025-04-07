import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js"
import type { Client, ChatInputCommandInteraction, User } from "discord.js"

import { 
    type DiscordReqObjectV3, 
    OfficialAPI
} from "earthmc"

import { backtick, listInputToArr } from "../../bot/utils/fn.js"
import CustomEmbed from "../../bot/objects/CustomEmbed.js"

const desc = "Interact with the Official EMC API discord endpoint. Discord -> UUID or vice versa."
const slashCmdData = new SlashCommandBuilder()
    .setName("discord")
    .setDescription(desc)
    .addSubcommand(subCmd => subCmd.setName('get_mc_uuids')
        .setDescription('Retrieves the Minecraft UUID for every Discord ID (if linked) in the input list.')
        .addStringOption(opt => opt.setName("discord_ids")
            .setDescription("A list of Discord IDs. Can be seperated by whitespace or commas.")
        )
    )
    .addSubcommand(subCmd => subCmd.setName('get_discord_ids')
        .setDescription('Retrieves the Discord IDs for every UUID (if linked) in the input list.')
        .addStringOption(opt => opt.setName("mc_uuids")
            .setDescription("A list of Minecraft UUIDs. Can be seperated by whitespace or commas.")
        )
    )

const sendReq = async (type: 'discord' | 'minecraft', discordOrMcIds: string[]) => {
    const reqObjs: DiscordReqObjectV3[] = discordOrMcIds.map(id => ({ type, target: id }))
    return OfficialAPI.V3.discord(...reqObjs)
}

const EMBED_COLOUR = Colors.Blurple

export default {
    name: "discord",
    description: desc,
    data: slashCmdData,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const subCmd = interaction.options.getSubcommand()
        switch (subCmd.toLowerCase()) {
            case "get_mc_uuids": {
                const input = interaction.options.getString("discord_ids", true)
                const ids = listInputToArr(input)

                const discordUsers = new Map<string, User>()
                const invalidUsers = new Set<string>()

                //#region Pre-check input IDs.
                for (const id of ids) {
                    // Discord UID must be 17-19 chars long. 20 digits won't happen until 2090 :)
                    if (id.length < 17 || id.length > 19) {
                        invalidUsers.add(id)
                        continue
                    }

                    // Could be valid, check against Discord API.
                    const discordUser = await client.users.fetch(id).catch(() => null)
                    if (discordUser) discordUsers.set(id, discordUser)
                    else invalidUsers.add(id)
                }

                // No point sending req, OAPI will fail at first bad ID and return an unusable body.
                if (invalidUsers.size > 0) {
                    return await interaction.editReply({ embeds: [new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle("Invalid ID(s) provided.")
                        .setDescription(`
                            The following ID(s) must be fixed or removed for this command to work.\n
                            ${[...invalidUsers.keys()].map(k => backtick(k)).join("\n")}
                        `)
                    ]})
                }
                //#endregion

                //#region Send req and err if empty/null.
                const resObjs = await sendReq('discord', ids)
                if (!resObjs || resObjs.length < 1) {
                    return await interaction.editReply({ embeds: [new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle("No valid arguments.")
                        .setDescription("None of the input Discord IDs seem to be valid!")
                    ]})
                }
                //#endregion

                const allData = resObjs.map(obj => {
                    const discordUser = discordUsers.get(obj.id)
                    return `${backtick(obj.id)} (${discordUser.username}) - ${backtick(obj.uuid || "Not Linked")}`
                }).join('\n').match(/(?:^.*$\n?){1,20}/mg)

                return await new CustomEmbed(client, "Discord Info | Discord IDs -> UUIDs")
                    .setColour(EMBED_COLOUR)
                    .paginate(allData)
                    .editInteraction(interaction)
            }
            case "get_discord_ids": {
                const input = interaction.options.getString("mc_uuids", true)
                const uuids = listInputToArr(input)

                // TODO: Validate uuids, report any that are invalid in result embed.
                //       If none are valid, skip sending OAPI req and show error embed.

                const resObjs = await sendReq('minecraft', uuids)
                if (resObjs.length < 1) {
                    return await interaction.editReply({ embeds: [new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle("No valid arguments.")
                        .setDescription("None of the input UUIDs seem to be valid!")
                    ]})
                }

                // TODO: Ideally we should find a way to avoid this and just build allData in a single pass.
                const discordUsers = new Map<string, User>()
                for (const obj of resObjs) {
                    const discordUser = await client.users.fetch(obj.id)
                    discordUsers.set(obj.uuid, discordUser)
                }

                const allData = resObjs.map(obj => {
                    // TODO: Get minecraft name from uuid and include it.
                    if (!obj.id) return `${backtick(obj.uuid)} - Not Linked`

                    const discordUser = discordUsers.get(obj.uuid)
                    return `${backtick(obj.uuid)} - ${backtick(obj.id)} (${discordUser.username})`
                }).join('\n').match(/(?:^.*$\n?){1,20}/mg)

                return await new CustomEmbed(client, "Discord Info | UUIDs -> Discord Users")
                    .setColour(EMBED_COLOUR)
                    .paginate(allData)
                    .editInteraction(interaction)
            }
        }

        const errEmbed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("Command ran with no subcommand !?")
            .setDescription("Honestly impressive.")
    
        return await interaction.editReply({ embeds: [errEmbed] })
    }
}