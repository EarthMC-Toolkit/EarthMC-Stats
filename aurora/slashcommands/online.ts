import { 
    type Client,
    type ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    Colors
} from 'discord.js'

import { Aurora, OfficialAPI, type Player } from "earthmc"
import { CustomEmbed } from '../../bot/objects/CustomEmbed.js'

import { 
    backtick,
    devsFooter, fetchError, sortByKey, 
    staff
} from '../../bot/utils/fn.js'
import { EMOJI_GOLD } from '../../bot/utils/discord.js'

const EMBED_COLOUR = "#d67a82"

function displayOnlineStaff(client: Client, interaction: ChatInputCommandInteraction, ops: Player[]) {
    const onlineStaff = staff.all().filter(sm => ops.some(op => op.name.toLowerCase() == sm.toLowerCase()))
    return interaction.editReply({embeds: [new EmbedBuilder()
        .setTitle("Online Activity | Staff")
        .setDescription(onlineStaff.length >= 1 ? "```" + onlineStaff.join(", ").toString() + "```" : "No staff are online right now! Try again later.")
        .setColor(EMBED_COLOUR)
        .setTimestamp()
        .setFooter(devsFooter(client))
    ]})
}

const slashCmdData = new SlashCommandBuilder()
    .setName("online")
    .setDescription("Several commands related to online players.")
    .addSubcommand(subCmd => subCmd.setName('all').setDescription('Lists every online player.'))
    .addSubcommand(subCmd => subCmd.setName('staff').setDescription('Lists all online staff.'))
    .addSubcommand(subCmd => subCmd.setName('mayors').setDescription('Lists all online mayors.'))
    .addSubcommand(subCmd => subCmd.setName('kings').setDescription('Lists all online kings.'))
    .addSubcommand(subCmd => subCmd.setName('baltop').setDescription('Lists all online players sorted by highest balance.'))

export default {
    name: "online",
    description: "Get online info for staff, mayors and more.",
    data: slashCmdData,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const ops: Player[] | null = await Aurora.Players.online().catch(() => null)
        if (!ops) return interaction.editReply({ embeds: [fetchError] /*ephemeral: true */ })

        switch(interaction.options.getSubcommand().toLowerCase()) {
            case "all": {
                // Alphabetical sort
                sortByKey(ops, 'name')

                const allData = ops
                    .map(op => op.name === op.nickname ? op.name : `${op.name} (${op.nickname})`)
                    .join('\n').match(/(?:^.*$\n?){1,20}/mg)
                
                return await new CustomEmbed(client, "Online Activity | All")
                    .setColour(EMBED_COLOUR)
                    .paginate(allData, "```", "```")
                    .editInteraction(interaction)
            }
            case "mods":
            case "staff":
                displayOnlineStaff(client, interaction, ops)
                break
            case "mayors": {
                const allTowns = await Aurora.Towns.all().catch(() => {})
                if (!allTowns || allTowns.length < 1) return await interaction.editReply({
                    embeds: [fetchError]
                    //ephemeral: true
                })

                const towns = allTowns.filter(t => ops.some(op => op.name == t.mayor))
                sortByKey(towns, 'mayor')
            
                const allData = towns.map(town => `${town.mayor} (${town.name})`).join('\n').match(/(?:^.*$\n?){1,20}/mg)
                return await new CustomEmbed(client, "Online Activity | Mayors")
                    .setColour(EMBED_COLOUR)
                    .paginate(allData, `Total: ${towns.length}` + "```", "```")
                    .editInteraction(interaction)
            }
            case "kings": {
                const allNations = await Aurora.Nations.all().catch(err => console.error(err))
                if (!allNations || allNations.length < 1) return await interaction.editReply({
                    embeds: [fetchError]
                    //ephemeral: true
                })

                const nations = allNations.filter(n => ops.some(op => op.name == n.king))
                sortByKey(nations, 'king')
            
                const allData = nations.map(nation => `${nation.king} (${nation.name})`)
                    .join('\n').match(/(?:^.*$\n?){1,20}/mg)

                return await new CustomEmbed(client, "Online Activity | Kings")
                    .setColour(EMBED_COLOUR)
                    .paginate(allData, `Total: ${nations.length}` + "```", "```")
                    .editInteraction(interaction)
            }
            case "balances":
            case "baltop": {
                const opNames = ops.map(o => o.name)
                const players = await OfficialAPI.V3.players(...opNames).catch(err => console.error(err))
                if (!players || players.length < 1) {
                    return await interaction.editReply({ embeds: [fetchError] })
                }

                // Descending order, highest to lowest.
                players.sort((a, b) => b.stats.balance - a.stats.balance)

                const allData = players.map(p => {
                    let str = `${backtick(p.name)}`
                    
                    if (p.town.name) {
                        str += p.nation.name 
                            ? ` of ${p.town.name} (**${p.nation.name}**)` 
                            : ` of ${p.town.name}`
                    }

                    return str + ` - ${backtick(p.stats.balance)}G`
                }).join('\n').match(/(?:^.*$\n?){1,20}/mg)

                const total = players.reduce((acc, p) => acc + p.stats.balance, 0).toLocaleString()
                return await new CustomEmbed(client, "Online Activity | Balances")
                    .setColour(EMBED_COLOUR)
                    .paginate(allData, `Online: ${backtick(players.length)} (${EMOJI_GOLD} ${total}G)\n\n`)
                    .editInteraction(interaction)
            }
            default: return await interaction.editReply({embeds: [new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("Invalid Arguments")
                .setDescription("Arguments: `all`, `staff`, `mayors`, `kings`")
            ]})
        }
    }
}