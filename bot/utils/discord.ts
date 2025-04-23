import {
    ActionRowBuilder,
    ButtonBuilder, ButtonStyle,
    ComponentType
} from "discord.js"

import type { 
    Client, Message,
    ButtonInteraction, CommandInteraction,
    EmbedBuilder, EmojiIdentifierResolvable,
    APIActionRowComponent, APIMessageActionRowComponent
} from "discord.js"

import { Timestamp } from "firebase-admin/firestore"
import { msToSec } from "./fn.js"

//#region Discord Timestamp Formatting
// Cheat Sheet: https://gist.github.com/LeviSnoot/d9147767abeef2f770e9ddcd91eb85aa

// export function timestampDefault(timestamp: number | Timestamp) {
//     return `<t:${timestampToSec(timestamp)}>` as const
// }

// export function timestampDate(timestamp: number | Timestamp) {
//     return `<t:${timestampToSec(timestamp)}:D>` as const
// }

/**
 * Formats the timestamp into its full date and time. For example: `Wednesday, November 28, 2018 9:01 AM`
 * @param timestamp The timestamp to format. Seconds are preferred, but ms should work.
 */
export function timestampDateTime(timestamp: number | Timestamp) {
    return `<t:${timestampToSec(timestamp)}:F>` as const
}

/**
 * Formats the timestamp according to the relative time. For example: `6 seconds ago`, `21 days ago`, `4 months ago` etc.
 * @param timestamp The timestamp to format. Seconds are preferred, but ms should work.
 */
export function timestampRelative(timestamp: number | Timestamp) {
    return `<t:${timestampToSec(timestamp)}:R>` as const
}

function timestampToSec(timestamp: number | Timestamp) {
    if (timestamp instanceof Timestamp) return timestamp.seconds
    return timestamp > 1e12 ? msToSec(timestamp) : timestamp
}
//#endregion

//#region Emoji Formatting
/** Represents the gold bar emoji from the toolkit discord.*/
export const EMOJI_GOLD = "<:gold:1318944918118600764>"

/** Represents the chunk emoji from the toolkit discord. */
export const EMOJI_CHUNK = "<:chunk:1318944677562679398>"
//#endregion

//#region Limits
export const CHOICE_LIMIT = 25
export const MAX_ROW_BTNS = 5
//#endregion

//#region Pagination
// type ForwardCallback = (
//     interaction: ButtonInteraction, 
//     msg: Message,
//     embeds: EmbedBuilder[]
// ) => Awaitable<any>

const fiveMin = 5 * 60 * 1000
export const paginator = async(
    author: string, 
    msg: Message, 
    embeds: EmbedBuilder[], 
    currentPage: number
    // TODO: Implement this. For running specified method on fwd/back.
    // _forward: ForwardCallback
) => {
    // DM messages don't work with component collectors right now
    // if (msg?.channel?.type == ChannelType.DM) {
    //     return await msg.edit("DMs do not support buttons yet! Try again in a server.")
    // }

    // Create collector which will listen for a button interaction. (If it passes the filter)
    const collector = msg.createMessageComponentCollector({ 
        filter: (i: ButtonInteraction) => { 
            i.deferUpdate()
            return i.user.id === author // Only the original sender is allowed to press buttons.
        },
        componentType: ComponentType.Button,
        time: fiveMin
    })

    const lastPage = embeds.length - 1

    // Edit message to show arrow buttons
    await msg.edit({ components: [buildButtons(currentPage, lastPage)] }).catch(console.error)
    setTimeout(() => msg.edit({ components: [] }).catch(() => {}), fiveMin)

    collector.on("collect", async interaction => {
        currentPage = interaction.customId == "last" ? lastPage 
            : interaction.customId == "back" ? Math.max(currentPage - 1, 0) 
            : interaction.customId == "forward" ? Math.min(currentPage + 1, lastPage) : 0

        await msg.edit({
            embeds: [embeds[currentPage]],
            components: [buildButtons(currentPage, lastPage)]
        })
    })
}

/** Helper method to create a paginator on an interaction. */
export const paginatorInteraction = async(
    interaction: CommandInteraction | ButtonInteraction,
    embeds: EmbedBuilder[],
    currentPage: number
) => {
    try {
        const msg: Message = await interaction.fetchReply()
        if (!msg) throw new Error("Message could not be fetched: fetchReply returned null.")

        doPaginatorInteraction(interaction, msg, embeds, currentPage)
    } catch(e) {
        console.warn("Failed to paginate interaction.\n" + e)
    }
}

export const doPaginatorInteraction = async(
    interaction: CommandInteraction | ButtonInteraction,
    msg: Message,
    embeds: EmbedBuilder[],
    currentPage: number
) => {
    // Create collector which will listen for a button interaction. (If it passes the filter)
    const collector = msg.createMessageComponentCollector({ 
        filter: (i: ButtonInteraction) => { 
            i.deferUpdate()
            return i.user.id === interaction.user.id // Only the original sender is allowed to press buttons.
        },
        componentType: ComponentType.Button,
        time: fiveMin
    })

    const lastPage = embeds.length - 1

    // Edit message to show arrow buttons
    await interaction.editReply({ components: [buildButtons(currentPage, lastPage)] }).catch(console.error)
    setTimeout(() => interaction.editReply({ components: [] }).catch(() => {}), fiveMin)

    collector.on("collect", async i => {
        currentPage = i.customId == "last" ? lastPage 
            : i.customId == "back" ? Math.max(currentPage - 1, 0) 
            : i.customId == "forward" ? Math.min(currentPage + 1, lastPage) : 0

        await interaction.editReply({
            embeds: [embeds[currentPage]],
            components: [buildButtons(currentPage, lastPage)]
        })
    })
}
//#endregion

const buildButtons = (currentPage: number, lastPage: number) => {
    const noFurther = currentPage >= lastPage
    const noLess = currentPage <= 0

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        emojiButton("first", "⏪", noLess), emojiButton("back", "◀", noLess), 
        emojiButton("forward", "▶", noFurther), emojiButton("last", "⏩", noFurther)
    ).toJSON() satisfies APIActionRowComponent<APIMessageActionRowComponent>
}

export const emojiButton = (
    id: string, 
    emoji: EmojiIdentifierResolvable, 
    disabled: boolean
) => new ButtonBuilder({
    customId: id,
    emoji: emoji,
    disabled: disabled,
    style: ButtonStyle.Primary
})

export const getUserCount = (client: Client) => client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)

/** Checks whether the client can view and send messages in a channel */
// function canViewAndSend(channel: Channel) {
//     switch (channel.type) {
//         case ChannelType.GuildText:
//         case ChannelType.GuildAnnouncement: {
//             if (!channel.viewable) return false
//             return channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.SendMessages)
//         }
//         case ChannelType.AnnouncementThread:
//         case ChannelType.PublicThread:
//         case ChannelType.PrivateThread: {
//             return channel.joinable && channel.sendable
//         }
//         default: return false
//     }
// }