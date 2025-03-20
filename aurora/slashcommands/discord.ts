import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js"
import type { Client, ChatInputCommandInteraction } from "discord.js"

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

                // TODO: Validate ids, report any that are invalid in result embed.
                //       If none are valid, skip sending OAPI req and show error embed.

                const resObjs = await sendReq('discord', ids)

                // TODO: Get discord names from ids and include them.
                const allData = resObjs.map(obj => `${backtick(obj.id)} - ${backtick(obj.uuid)}`)
                    .join('\n').match(/(?:^.*$\n?){1,20}/mg)

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

                const allData = resObjs.map(async obj => {
                    const discordUser = await client.users.fetch(obj.id)
                    return `${backtick(obj.uuid)} - ${backtick(obj.uuid)} (${discordUser.username})`
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