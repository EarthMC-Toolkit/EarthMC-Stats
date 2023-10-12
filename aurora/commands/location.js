const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn.js')

const buildUrl = (x, z, zoom = 4) =>
    `[Click here](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=${zoom}&x=${x}&y=64&z=${z})`

const inWorldBorder = (x, z) => {
    const [numX, numZ] = [Number(x), Number(z)]
    return numX >= 33081 || numX < -33280 || 
           numZ >= 16508 || numZ < -16640
}

const embed = (
    client, 
    title="Error while using /location:", 
    colour="RED"
) => {
    return new Discord.MessageEmbed()
        .setTitle(title)
        .setColor(colour)
        .setFooter(fn.devsFooter(client))
        .setTimestamp()
}

module.exports = {
    name: "location",
    aliases: ["loc"],
    slashCommand: true,
    run: async (client, message, args) => {
        const [xcoord, zcoord, zoom] = [args[0], args[1], args[2]]

        if (!xcoord || !zcoord || isNaN(xcoord) || isNaN(zcoord)) {
            return message.reply({embeds: [embed(client)
                .setDescription("Invalid arguments!\n\nUsage: `/loc xcoord zcoord`")
            ]}).then(m => setTimeout(() => m.delete(), 10000))
        }
        else if (inWorldBorder(xcoord, zcoord)) {
            return message.reply({embeds: [embed(client)
                .setDescription("Please enter 2 values that are inside EarthMC's world border.")
            ]}).then(m => setTimeout(() => m.delete(), 10000))
        }
        else {
            if (!zoom) return message.reply({embeds: [
                embed(client, `(Aurora) Map location for X: ${xcoord}, Z: ${zcoord}`, "GREEN")
                .addFields(fn.embedField("Dynmap Link", buildUrl(xcoord, zcoord)))
            ]})

            if (!isNaN(zoom) && Number(zoom) < 11) {
                return message.reply({embeds: [
                    embed(client, `(Aurora) Map location for X: ${xcoord}, Z: ${zcoord}`, "GREEN")
                    .addFields(
                        fn.embedField("Dynmap Link", buildUrl(xcoord, zcoord, zoom)),
                        fn.embedField("Zoom", zoom.toString())
                    )
                ]})
            }
        
            return message.reply({embeds: [embed(client)
                .setDescription("`" + zoom + "`" + " is not a valid zoom! Please use a number from 1-10.")
            ]}).then(msg => setTimeout(() => msg.delete(), 10000)).catch(() => {})
        }
    }
}