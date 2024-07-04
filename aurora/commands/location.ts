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

        const mapUrl = Aurora.buildMapLink(zoom ? Number(zoom) : 4, { x: xCoord, z: zCoord })
        if (!zoom) return message.reply({embeds: [
            embed(client, `(Aurora) Map location for X: ${xCoord}, Z: ${zCoord}`, Colors.Green)
            .addFields(embedField("Map Link", `[Click here](${mapUrl.toString()})`))
        ]})

        const zoomNum = Number(zoom)
        if (!isNaN(zoomNum) && zoomNum < 11) return message.reply({embeds: [
            embed(client, `(Aurora) Map location for X: ${xCoord}, Z: ${zCoord}`, Colors.Green)
            .addFields(
                embedField("Map Link", `[Click here](${mapUrl.toString()})`, true),
                embedField("Zoom", `${zoom}x`)
            )
        ]})
    
        return message.reply({embeds: [
            embed(client).setDescription("`" + zoom + "`" + " is not a valid zoom! Please use a number from 1-10.")
        ]}).then(msg => setTimeout(() => msg.delete(), 10000)).catch(() => {})
    }
}