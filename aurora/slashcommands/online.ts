import { 
    type Client,
    type ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    Colors
} from 'discord.js'

import { CustomEmbed } from '../../bot/objects/CustomEmbed.js'

import * as fn from '../../bot/utils/fn.js'
import { Aurora, type Player } from "earthmc"

const EMBED_COLOUR = "#d67a82"

function displayOnlineStaff(client: Client, interaction: ChatInputCommandInteraction, ops: Player[]) {
    const onlineStaff = fn.staff.all().filter(sm => ops.find(op => op.name.toLowerCase() == sm.toLowerCase()))
    return interaction.editReply({embeds: [new EmbedBuilder()
        .setTitle("Online Activity | Staff")
        .setDescription(onlineStaff.length >= 1 ? "```" + onlineStaff.join(", ").toString() + "```" : "No staff are online right now! Try again later.")
        .setColor(EMBED_COLOUR)
        .setTimestamp()
        .setFooter(fn.devsFooter(client))
    ]})
}

export default {
    name: "online",
    description: "Get online info for staff, mayors and more.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const ops: Player[] | null = await Aurora.Players.online().catch(() => null)
        if (!ops) return interaction.editReply({ embeds: [fn.fetchError] /*ephemeral: true */ })

        switch(interaction.options.getSubcommand().toLowerCase()) {
            case "all": {
                // Alphabetical sort
                fn.sortByKey(ops, 'name')

                const allData = ops
                    .map(op => op.name === op.nickname ? op.name : `${op.name} (${op.nickname})`)
                    .join('\n').match(/(?:^.*$\n?){1,20}/mg)
                
                return await new CustomEmbed(client, "Online Activity | All")
                    .setPage(0)
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
                    embeds: [fn.fetchError]
                    //ephemeral: true
                })

                const towns = allTowns.filter(t => ops.find(op => op.name == t.mayor))
                fn.sortByKey(towns, 'mayor')
            
                const allData = towns.map(town => `${town.mayor} (${town.name})`).join('\n').match(/(?:^.*$\n?){1,20}/mg)
                return await new CustomEmbed(client, "Online Activity | Mayors")
                    .setPage(0)
                    .setColour(EMBED_COLOUR)
                    .paginate(allData, `Total: ${towns.length}` + "```", "```")
                    .editInteraction(interaction)
            }
            case "kings": {
                const allNations = await Aurora.Nations.all().catch(err => console.log(err))
                if (!allNations || allNations.length < 1) return await interaction.editReply({
                    embeds: [fn.fetchError]
                    //ephemeral: true
                })

                const nations = allNations.filter(n => ops.find(op => op.name == n.king))
                fn.sortByKey(nations, 'king')
            
                const allData = nations.map(nation => `${nation.king} (${nation.name})`).join('\n').match(/(?:^.*$\n?){1,20}/mg)
                return await new CustomEmbed(client, "Online Activity | Kings")
                    .setPage(0)
                    .setColour(EMBED_COLOUR)
                    .paginate(allData, `Total: ${nations.length}` + "```", "```")
                    .editInteraction(interaction)
            }
            default: return await interaction.editReply({embeds: [new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("Invalid Arguments")
                .setDescription("Arguments: `all`, `staff`, `mayors`, `kings`")
            ] /* ephemeral: true */ })
        }
    }, data: new SlashCommandBuilder()
        .setName("online")
        .setDescription("Several commands related to online players.")
        .addSubcommand(subCmd => subCmd.setName('all').setDescription('Lists every online player.'))
        .addSubcommand(subCmd => subCmd.setName('staff').setDescription('Lists all online staff.'))
        .addSubcommand(subCmd => subCmd.setName('mayors').setDescription('Lists all online mayors.'))
        .addSubcommand(subCmd => subCmd.setName('kings').setDescription('Lists all online kings.'))
}