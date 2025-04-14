import {
    type ButtonInteraction,
    type Client
} from "discord.js"

import CustomEmbed from "../../bot/objects/CustomEmbed.js"
import { cache } from "../../bot/constants.js"
import { paginatorInteraction } from "../../bot/utils/index.js"

import type { Button, DBSquaremapNation } from "../../bot/types.js"

// Appears when `/nation lookup` cannot display all towns.
const viewTownsBtn: Button = {
    id: "view_all_towns",
    execute: (client: Client, interaction: ButtonInteraction) => {
        // Original message this button is attached to.
        const { id } = interaction.message

        const nation: DBSquaremapNation = cache.get(`nation_lookup_${id}`)
        if (!nation) return interaction.reply({
            content: "Could not reference the nation from the original message, please run `lookup` again.",
            ephemeral: true
        })

        const sortedTowns = nation.towns.sort()
        const data = sortedTowns.join("\n").match(/(?:^.*$\n?){1,20}/mg)
        
        const embed = new CustomEmbed(client, `All Towns | ${nation.name}`)
            .setColour("Aqua")
            .paginate(data, `Total: ${sortedTowns.length}` + "```", "```")
 
        // Reply to original message, but paginate our own message/interaction.
        return interaction.message.reply(embed.payload(true))
            .then(() => paginatorInteraction(interaction, embed.embeds, embed.page))

        // return interaction.reply({ 
        //     content: "Not yet implemented.",
        //     ephemeral: true,
        //     files: []
        // })
    }
}

export default viewTownsBtn