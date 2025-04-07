import { secToMs } from "./fn.js"

//#region Discord Timestamp Formatting
// Cheat Sheet: https://gist.github.com/LeviSnoot/d9147767abeef2f770e9ddcd91eb85aa

export function timestampDefault(timestamp: number) {
    return `<t:${secToMs(timestamp)}>`
}

export function timestampDate(timestamp: number) {
    return `<t:${secToMs(timestamp)}:D>`
}

/**
 * Formats the timestamp into its full date and time. For example: `Wednesday, November 28, 2018 9:01 AM`
 * @param timestamp The timestamp to format.
 * @returns The formatted timestamp as a string.
 */
export function timestampDateTime(timestamp: number) {
    return `<t:${secToMs(timestamp)}:F>`
}

/**
 * Formats the timestamp according to the relative time. For example: `6 seconds ago`, `21 days ago`, `4 months ago` etc.
 * @param timestamp The timestamp to format.
 * @returns The formatted timestamp as a string.
 */
export function timestampRelative(timestamp: number) {
    return `<t:${secToMs(timestamp)}:R>`
}
//#endregion

//#region Emoji Formatting
/** Represents the gold bar emoji from the toolkit discord.*/
export const EMOJI_GOLD = "<:gold:1318944918118600764>"

/** Represents the chunk emoji from the toolkit discord. */
export const EMOJI_CHUNK = "<:chunk:1318944677562679398>"
//#endregion