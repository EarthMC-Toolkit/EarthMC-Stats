import * as fn from '../../bot/utils/fn.js'

import { EmbedBuilder, Colors } from 'discord.js'
import type { Client, Message } from 'discord.js'

export default {
    name: "location",
    aliases: ["loc"],
    run: async (client: Client, message: Message, args: string[]) => {
        const xcoord = args[0],
              zcoord = args[1],
              zoom = args[2]

        const numX = Number(xcoord)
        const numZ = Number(zcoord)
        const numZoom = Number(zoom)
      
        if (!xcoord || !zcoord || isNaN(numX) || isNaN(numZ)) {
            return message.reply({embeds: [new EmbedBuilder()
                .setTitle("Error while using /location:")
                .setDescription("Invalid arguments!\n\nUsage: `n/loc xcoord zcoord`")
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
                .setColor(Colors.Red)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        } else if (numX >= 33081 || numX < -33280 || numZ >= 16508 || numZ < -16640) {
            return message.reply({embeds: [new EmbedBuilder()
                .setTitle("Error while using /location:")
                .setColor(Colors.Red)
                .setDescription("Please enter 2 values that are inside EarthMC's world border.")
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }
        else {
            if (!zoom) return message.reply({embeds: [new EmbedBuilder()
                .setTitle("(Nova) Map location for X: " + xcoord + ", Z: " + zcoord + "")
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
                .setColor(Colors.Green)
                .addFields(fn.embedField(
                    "Dynmap Link", 
                    "[Click here](https://earthmc.net/map/nova/?worldname=earth&mapname=flat&zoom=4&x=" + xcoord + "&y=64&z=" + zcoord + ")"
                ))
            ]})

            if (!isNaN(numZoom) && numZoom < 11) return message.reply({embeds: [new EmbedBuilder()
                .setTitle("(Nova) Map location for X:" + xcoord + ", Z:" + zcoord)
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
                .setColor(Colors.Green)
                .addFields(
                    fn.embedField(
                        "Dynmap Link", 
                        "[Click here](https://earthmc.net/map/nova/?worldname=earth&mapname=flat&zoom=" + zoom + "&x=" + xcoord + "&y=64&z=" + zcoord + ")"
                    ),
                    fn.embedField("Zoom", zoom.toString())
                )
            ]})

            return message.reply({embeds: [new EmbedBuilder()
                .setTitle("Error while using /location:")
                .setColor(Colors.Red)
                .setDescription("`" + zoom + "`" + " is not a valid zoom! Please use a number from 1-10.")
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
            ]}).then(msg => setTimeout(() => msg.delete(), 10000)).catch(() => {})
        }
  }
}