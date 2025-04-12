import {
    type Client, 
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import { Aurora } from 'earthmc'
import { fastMerge, fetchError, paginatorInteraction } from '../../bot/utils/fn.js'
import { lastSeenPlayers } from "../../bot/constants.js"
import { getResidents } from "../../bot/utils/db/aurora.js"

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
    //#region
    const residents = await getResidents()
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

const send = (interaction: ChatInputCommandInteraction, allData: RegExpMatchArray, townless: { name: string }[]) => {
    const len = allData.length
    if (len <= 1) {
        // If only one page, don't create paginator.
        const desc = "```" + `${townless[0].name}\n${allData}` + "```"
        return interaction.reply({ embeds: [embed(townless.length, desc)] })
    }
    
    const botEmbed: EmbedBuilder[] = []
    for (let page = 0; page < len; page++) {
        const desc = "```" + `${townless[0].name}\n${allData[page]}` + "```"
        botEmbed[page] = embed(townless.length, desc, { text: `Page ${page+1}/${len}` })
    }

    return interaction.reply({ embeds: [botEmbed[0]] })
        .then(() => paginatorInteraction(interaction, botEmbed, 0))
        .catch(console.log)
}

const slashCmdData = new SlashCommandBuilder()
    .setName("townless")
    .setDescription("Lists all online townless players.")

export default {
    name: "townless",
    description: "Lists all online players without a town.",
    data: slashCmdData,
    run: async (_: Client, interaction: ChatInputCommandInteraction) => {
        let townless = await townlessLastSeen()
        const townlessAmt = townless.length

        if (townlessAmt < 1) {
            // Try emc.Townless() 
            const townless = await Aurora.Players.townless()
            if (!townless) return interaction.reply({ embeds: [fetchError], ephemeral: true })

            // Definitely no townless online, send appropriate msg.
            if (townless.length) return interaction.reply({
                embeds: [embed(0, "There are currently no townless players.")], 
                ephemeral: true
            })

            const allData = townless.map(p => p.name).join('\n').match(/(?:^.*$\n?){1,15}/mg)
            return send(interaction, allData, townless)
        }

        // Separate online and offline items
        const now = Date.now()

        const online = townless.filter(p => p.online)
        const offline = townless.filter(p => !p.online && ((now - p.timestamp) / 60000) <= 60)
            .sort((a, b) => b.timestamp - a.timestamp)

        // Concatenate online items (in original order) and sorted offline items
        townless = fastMerge(online, offline)

        const allData = townless.map(p => {
            if (p.online) return `${p.name}`

            const diff = now - p.timestamp
            const minSinceSeen = diff / 60000

            return minSinceSeen >= 1 ? 
                `${p.name} (Seen ${minSinceSeen.toFixed(0)}m ago)` : 
                `${p.name} (Seen ${(diff / 1000).toFixed(0)}s ago)`
        }).join('\n').match(/(?:^.*$\n?){1,15}/mg)

        console.log(townless.map(p => `${p.name} - vanished ${p.timesVanished} times. Currently: ${p.online ? "Online" : "Offline"}`))

        return send(interaction, allData, townless)
    }
}