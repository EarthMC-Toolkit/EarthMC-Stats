import {
    type Client, 
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import { Aurora } from 'earthmc'
import { paginatorInteraction } from '../../bot/utils/fn.js'
import { lastSeenPlayers } from "../../bot/constants.js"

const embed = (len: number, desc: string, footer?: { text: string, iconURL?: string }) => {
    const builder = new EmbedBuilder()
        .setColor(Colors.DarkPurple)
        .setTitle(`Townless Players [${len}]`)
        .setDescription(desc)
        .setTimestamp()

    if (footer) builder.setFooter(footer)
    return builder
}

const townlessLastSeen = async () => {
    //#region Cache these
    // TODO
    const residents = await Aurora.Residents.all()
    if (!residents) {
        console.warn(`[AURORA] Error getting townless, could not get residents!`)
        return null
    }

    const residentNames = new Set<string>(residents.reduce((out: string[], cur) => {
        out.push(cur.name)
        return out
    }, []))
    //#endregion

    return [...lastSeenPlayers.values()].filter(p => !residentNames.has(p.name))
}

export default {
    name: "townless",
    description: "Lists all online players without a town.",
    run: async (_: Client, interaction: ChatInputCommandInteraction) => {
        // const townlessPlayers = await Aurora.Players.townless()
        // if (!townlessPlayers) return await interaction.reply({ embeds: [fetchError], ephemeral: true })

        const townless = await townlessLastSeen()
        const townlessAmt = townless.length
        
        if (townlessAmt < 1) {
            // Try emc.Townless() 

            // Definitely no townless online, send appropriate msg.
            return interaction.reply({
                embeds: [embed(0, "There are currently no townless players.")], 
                ephemeral: true
            })
        }

        // const onlineTownless: SeenPlayer[] = []
        // const offlineTownless: SeenPlayer[] = []

        // // Single pass [O(n)] to avoid slight overhead of two filter/map calls. [O(2n)]
        // for (let i = 0; i < townlessAmt; i++) {
        //     const player = townless[i]
            
        //     if (player.online) onlineTownless.push(player)
        //     else offlineTownless.push(player)
        // }

        const allData = townless.sort((a, b) => (a.online === b.online) ? 0 : a.online ? -1 : 1).map(p => {
            if (p.online) return `${p.name}`

            const minSinceSeen = ((Date.now() - p.timestamp) / 60000)
            if (minSinceSeen >= 1) return `(Seen: ${minSinceSeen.toFixed(0)}m ago) ${p.name}`

            const secSinceSeen = ((Date.now() - p.timestamp) / 1000)
            return `(Seen: ${secSinceSeen.toFixed(0)}s ago) ${p.name}`
        }).join('\n').match(/(?:^.*$\n?){1,15}/mg)

        // console.log("---- Online Townless ----", onlineTownlessData)
        // console.log("----------------------------")
        // console.log("---- Offline Townless ----", offlineTownlessData)

        const len = allData.length
        if (len <= 1) {
            // If only one page, don't create paginator.
            const desc = "```" + `${townless[0].name}\n${allData}` + "```"
            return interaction.reply({ embeds: [embed(len, desc)] })
        }
        
        const botEmbed: EmbedBuilder[] = []
        for (let page = 0; page < len; page++) {
            const desc = "```" + `${townless[0].name}\n${allData[page]}` + "```"
            botEmbed[page] = embed(townlessAmt, desc, { text: `Page ${page+1}/${len}` })
        }

        await interaction.reply({ embeds: [botEmbed[0]] })
            .then(() => paginatorInteraction(interaction, botEmbed, 0))
            .catch(console.log)
    }, data: new SlashCommandBuilder()
        .setName("townless")
        .setDescription("Lists all online townless players.")
}