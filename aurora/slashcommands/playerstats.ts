import { 
    OfficialAPI,
    type RawPlayerStatsV3
} from "earthmc"

import { 
    type Client,
    type ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js"

import type { SlashCommand } from "../../bot/types.js"
import * as database from "../../bot/utils/database.js"
import CustomEmbed from "../../bot/objects/CustomEmbed.js"

const desc = "Displays various total stats by players over the servers lifetime. Kills/deaths, play time etc."
const slashCmdData = new SlashCommandBuilder()
    .setName("playerstats")
    .setDescription(desc)
    .addSubcommand(subCmd => subCmd.setName("default")
        .setDescription("Displays the player stats with the default 'similar name' sort.")
    )
    .addSubcommand(subCmd => subCmd.setName("alphabetical")
        .setDescription("Displays the player stats alphabetically by their key names.")
    )

// 1. Format entries to strings like so `some_stat: 10,000`.
// 2. Seperate by new lines.
// 3. Make into arr where each element holds X amount of lines.
const blackMagic = (obj: Record<string, number>) => Object.entries(obj)
    .map(e => `${e[0]}: ${e[1].toLocaleString()}`).join('\n')
    .match(/(?:^.*$\n?){1,20}/mg) // TODO: Support dynamic lines per page instead of hardcoding it.

const playerStatsCmd: SlashCommand<typeof slashCmdData> = {
    name: "playerstats",
    description: desc,
    data: slashCmdData,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        // Get stats from OAPI.
        let pStats: RawPlayerStatsV3 = await OfficialAPI.V3.playerStats().catch(e => { 
            console.error("Error getting player stats from the Official API:\n" + e)
            return null
        })

        // Try fall back to DB or show err embed as last resort.
        if (!pStats || Object.keys(pStats).length < 1) {
            pStats = await database.Aurora.getPlayerStats().catch(e => { 
                console.error("Error getting player stats from the DB:\n" + e)
                return null
            })

            if (!pStats) {
                return new CustomEmbed(client, "Error getting player stats")
                    .setColour("Red")
                    .setDescription("I couldn't get player stats from the OfficialAPI or the DB :(")
            }
        }

        const subCmd = interaction.options.getSubcommand()
        switch(subCmd) {
            case "alphabetical": {
                // Sort by key name and rebuild according to that.
                const sortedStats = Object.keys(pStats).sort().reduce((obj, key) => {
                    obj[key] = pStats[key]
                    return obj
                }, {})

                const data = blackMagic(sortedStats)
                return new CustomEmbed(client, "Player Statistics | Alphabetical Order")
                    .setColour("LightGrey")
                    .paginate(data, "```", "```")
                    .editInteraction(interaction)
            }
            default: {
                // No sort order, just use one from NPM.
                const data = blackMagic(pStats)
                return new CustomEmbed(client, "Player Statistics")
                    .setColour("LightGrey")
                    .paginate(data, "```", "```")
                    .editInteraction(interaction)
            }
        }

        // TODO: Add cmd where embed is returned and group stats using fields
        //       so we have a nicer looking alternative instead of paginating.
    }
}

export default playerStatsCmd