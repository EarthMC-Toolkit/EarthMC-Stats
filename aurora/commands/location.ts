import { devsFooter, embedField, inWorldBorder } from '../../bot/utils/fn.js'

import { EmbedBuilder, Colors } from 'discord.js'
import type { Client, Message, ColorResolvable } from 'discord.js'
import { Aurora } from 'earthmc'

const embed = (
    client, 
    title = "Error while using /location:", 
    colour: ColorResolvable = Colors.Red
) => new EmbedBuilder()
    .setTitle(title)
    .setColor(colour)
    .setFooter(devsFooter(client))
    .setTimestamp()

export default {
    name: "location",
    aliases: ["loc", "locate"],
    slashCommand: true,
    run: async (client: Client, message: Message, args: string[]) => {
        const [xCoord, zCoord, zoom] = [args[0], args[1], args[2]]
        const [numX, numZ] = [Number(xCoord), Number(zCoord)]

        if (!xCoord || !zCoord || isNaN(numX) || isNaN(numZ)) {
            return message.reply({embeds: [embed(client)
                .setDescription("Invalid arguments!\n\nUsage: `/loc <x> <z>` or `/loc <x> <z> <zoom>`")
            ]}).then(m => setTimeout(() => m.delete(), 10000))
        }

        if (inWorldBorder(numX, numZ)) return message.reply({embeds: [
            embed(client).setDescription("Specified coordinates are not inside EarthMC's world border!")
        ]}).then(m => setTimeout(() => m.delete(), 10000))

        if (!zoom) {
            const mapUrl = Aurora.buildMapLink(zoom ? Number(zoom) : null, { x: xCoord, z: zCoord })
            return message.reply({embeds: [
                embed(client, `(Aurora) Location Info`, Colors.Green)
                .addFields(
                    embedField("Coordinates (X, Z)", `X: \`${numX}\`\nZ: \`${numZ}\``, true),
                    embedField("Map Link", `[Click to open](${mapUrl.toString()})`)
                )
            ]})
        }

        const zoomNum = Number(zoom)
        if (!isNaN(zoomNum) && zoomNum < 11) {
            const mapUrl = Aurora.buildMapLink(zoomNum, { x: xCoord, z: zCoord })

            return message.reply({embeds: [
                embed(client, `(Aurora) Location Info`, Colors.Green)
                .addFields(
                    embedField("Coordinates (X, Z)", `X: \`${numX}\`\nZ: \`${numZ}\``, true),
                    embedField("Zoom", `\`${zoom}\`x`, true),
                    embedField("Map Link", `[Click to open](${mapUrl.toString()})`)
                )
            ]})
        }
    
        return message.reply({embeds: [
            embed(client).setDescription("`" + zoom + "`" + " is not a valid zoom! Please use a number from 1-10.")
        ]}).then(msg => setTimeout(() => msg.delete(), 10000)).catch(() => {})
    }
}