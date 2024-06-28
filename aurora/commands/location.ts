import { devsFooter, embedField } from '../../bot/utils/fn.js'

import { EmbedBuilder, Colors } from 'discord.js'
import type { Client, Message, ColorResolvable } from 'discord.js'

const buildUrl = (x: number | string, z: number | string, zoom = 4) =>
    `[Click here](https://map.earthmc.net?worldname=earth&mapname=flat&zoom=${zoom}&x=${x}&y=64&z=${z})`

const inWorldBorder = (x, z) => {
    const [numX, numZ] = [Number(x), Number(z)]
    return numX >= 33081 || numX < -33280 || 
           numZ >= 16508 || numZ < -16640
}

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
    aliases: ["loc"],
    slashCommand: true,
    run: async (client: Client, message: Message, args: string[]) => {
        const [xcoord, zcoord, zoom] = [args[0], args[1], args[2]]

        if (!xcoord || !zcoord || isNaN(Number(xcoord)) || isNaN(Number(zcoord))) {
            return message.reply({embeds: [embed(client)
                .setDescription("Invalid arguments!\n\nUsage: `/loc xcoord zcoord`")
            ]}).then(m => setTimeout(() => m.delete(), 10000))
        }

        if (inWorldBorder(xcoord, zcoord)) {
            return message.reply({embeds: [
                embed(client).setDescription("Please enter 2 values that are inside EarthMC's world border.")
            ]}).then(m => setTimeout(() => m.delete(), 10000))
        }
        
        if (!zoom) return message.reply({embeds: [
            embed(client, `(Aurora) Map location for X: ${xcoord}, Z: ${zcoord}`, Colors.Green)
            .addFields(embedField("Dynmap Link", buildUrl(xcoord, zcoord)))
        ]})

        const zoomNum = Number(zoom)
        if (!isNaN(zoomNum) && zoomNum < 11) return message.reply({embeds: [
            embed(client, `(Aurora) Map location for X: ${xcoord}, Z: ${zcoord}`, Colors.Green)
            .addFields(
                embedField("Dynmap Link", buildUrl(xcoord, zcoord, zoomNum)),
                embedField("Zoom", zoom)
            )
        ]})
    
        return message.reply({embeds: [
            embed(client).setDescription("`" + zoom + "`" + " is not a valid zoom! Please use a number from 1-10.")
        ]}).then(msg => setTimeout(() => msg.delete(), 10000)).catch(() => {})
    }
}