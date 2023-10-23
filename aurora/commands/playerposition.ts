import Discord from "discord.js"
import striptags from 'striptags'

import * as fn from '../../bot/utils/fn.js'
import * as db from '../../bot/utils/database.js'

export default {
    name: "playerposition",
    description: "Get a players current location.",
    slashCommand: true,
    aliases: ["pos", "playerpos"],
    run: async (client: Discord.Client, message: Discord.Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [new Discord.EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching player position, this might take a moment.")
            .setColor(Discord.Colors.DarkVividPink)]})
            
        if (!req) return m.edit({embeds: [
            new Discord.EmbedBuilder()
            .setTimestamp()
            .setColor(Discord.Colors.Red)
            .setTitle("Error while using /playerposition:")
            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
            .setDescription("Not enough arguments, please provide a valid playername.\nOptions: `/playerposition playerName` or `/playerposition live playerName`")
            .setFooter(fn.devsFooter(client))]
        })

        const townydata = await db.Aurora.getOnlinePlayerData() as any
        if (!townydata) return m.edit({embeds: [ 
            new Discord.EmbedBuilder()
            .setTimestamp()
            .setColor(Discord.Colors.Red)
            .setTitle("Connection Issues")
            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
            .setDescription("Unable to fetch Towny data, the server may be down for maintenance.\n\nPlease try again later.")
            .setFooter(fn.devsFooter(client))]
        }).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        const onlinePlayers = townydata.players
        const arg0 = args[0]?.toLowerCase()

        if (arg0 != "live") {
            const foundPlayer = onlinePlayers.find(op => op.account.toLowerCase() == arg0)
          
            if (foundPlayer && !fn.botDevs.includes(arg0)) {
                const acc = foundPlayer.account

                if (foundPlayer.world == "-some-other-bogus-world-") {
                    return m.edit({embeds: [
                        new Discord.EmbedBuilder()
                        .setTitle("Location Unavailable")
                        .setDescription(`${acc} seems to be invisible, under a block, or in the nether. Please try again later.`)
                        .setColor(Discord.Colors.DarkGold)
                        .setTimestamp()
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
                }
                else {
                    const locationEmbed = new Discord.EmbedBuilder()
                        .setTitle(`Location Info | ${acc}`)
                        .setThumbnail(`https://minotar.net/helm/${acc}/256.png`)
                        .setColor(Discord.Colors.DarkVividPink)
                        .setTimestamp()
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                        .setFooter(fn.devsFooter(client))
                      
                    const foundPlayerNickname = striptags(foundPlayer.name)
                      
                    if (acc !== foundPlayerNickname) 
                        locationEmbed.addFields(fn.embedField("Nickname", foundPlayerNickname))
                      
                    locationEmbed.addFields(fn.embedField("Coordinates", "X: " + foundPlayer.x + "\nY: " + (foundPlayer.y - 1) + "\nZ: " + foundPlayer.z))
                    locationEmbed.addFields(fn.embedField(
                        "Dynmap Link", "[" + foundPlayer.x + ", " + foundPlayer.z + "]" + 
                        "(https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=7&x=" + foundPlayer.x + "&y=64&z=" + foundPlayer.z + ")"
                    ))

                    return m.edit({ embeds: [locationEmbed] }).catch(() => {})
                }
            } else return m.edit({embeds: [
                new Discord.EmbedBuilder()
                    .setTitle("Error fetching player")
                    .setDescription(args[0] + " isn't online or does not exist!")
                    .setTimestamp()
                    .setColor(Discord.Colors.Red)
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
            ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
        } else {
            if (!args[1]) return m.edit({embeds: [
                new Discord.EmbedBuilder()
                .setTitle("No player specified")
                .setDescription("Please specify a player! Usage: `/pos live playerName`")
                .setTimestamp()
                .setColor(Discord.Colors.Red)
                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
            ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
            
            const foundPlayerOld = onlinePlayers.find(op => op.account.toLowerCase() == args[1].toLowerCase())
              
            if (!foundPlayerOld || fn.botDevs.includes(args[1].toLowerCase())) {
                return m.edit({embeds: [
                    new Discord.EmbedBuilder()
                    .setTitle("Error fetching player")
                    .setDescription(args[1] + " is offline or does not exist!")
                    .setTimestamp()
                    .setColor(Discord.Colors.Red)
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
            }
              
            const liveLocationEmbed = new Discord.EmbedBuilder().setTimestamp()
                .setColor(Discord.Colors.DarkVividPink)
                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                .setFooter(fn.devsFooter(client))
                .setTitle("Location Info | " + foundPlayerOld.account)
                .setDescription(
                    "Live Location: \nX: " + foundPlayerOld.x + "\nY: " + (foundPlayerOld.y - 1) + "\nZ: " + foundPlayerOld.z + 
                    "\n\nDynmap Link: " + "[" + foundPlayerOld.x + ", " + foundPlayerOld.z + "]" + 
                    "(https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=7&x=" + foundPlayerOld.x + "&y=64&z=" + foundPlayerOld.z + ")"
                )
              
            let lastValidLocation = { x: 0, y: 0, z: 0 },
                timedOut = false

            const fiveMin = 5*60*1000,
                  countDownDate = Date.now() + fiveMin

            async function livePosFunc() { 
                const townydata = await db.Aurora.getOnlinePlayerData() as any
                  
                if (!townydata) return m.edit({embeds: [
                    new Discord.EmbedBuilder()
                    .setTitle("Connection Issues | Timed Out")
                    .setDescription(
                        "Last Known Location: \nX: " + lastValidLocation.x + "\nY: " + (lastValidLocation.y - 1) + "\nZ: " + lastValidLocation.z + 
                        "\n\nDynmap Link: " + "[" + lastValidLocation.x + ", " + lastValidLocation.z + "]" + 
                        "(https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=7&x=" + lastValidLocation.x + "&y=64&z=" + lastValidLocation.z + ")")
                    .setColor(Discord.Colors.Red)
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setTimestamp()
                ]}).catch(() => {})
                
                const onlinePlayersNew = townydata.players,                       
                      foundPlayerNew = onlinePlayersNew.find(op => op.account.toLowerCase() == args[1].toLowerCase())
                  
                if (!foundPlayerNew) {
                    return m.edit({embeds: [
                        new Discord.EmbedBuilder()
                        .setTitle("Error fetching player")
                        .setDescription(args[1] + " has gone offline!")
                        .setTimestamp()
                        .setColor(Discord.Colors.Red)
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
                }
                  
                // If they are in the earth world
                if (foundPlayerNew.world != "-some-other-bogus-world-") {
                    lastValidLocation = {
                        x: foundPlayerNew.x,
                        y: foundPlayerNew.y,
                        z: foundPlayerNew.z                        
                    }
                    
                    liveLocationEmbed.setDescription(
                        "Live Location: \nX: " + foundPlayerNew.x + "\nY: " + (foundPlayerNew.y - 1) + "\nZ: " + foundPlayerNew.z + 
                        "\n\nDynmap Link: " + "[" + foundPlayerNew.x + ", " + foundPlayerNew.z + "]" + 
                        "(https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=7&x=" + foundPlayerNew.x + "&y=64&z=" + foundPlayerNew.z + ")"
                    )    
                } else {
                    if (!lastValidLocation) liveLocationEmbed.setDescription("Can't get location, please wait until this player appears on the dynmap.")
                    else {
                        liveLocationEmbed.setDescription(
                            "Last Known Location: \nX: " + lastValidLocation.x + "\nY: " + (lastValidLocation.y - 1) + "\nZ: " + lastValidLocation.z + 
                            "\n\nDynmap Link: " + "[" + lastValidLocation.x + ", " + lastValidLocation.z + "]" + 
                            "(https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=7&x=" + lastValidLocation.x + "&y=64&z=" + lastValidLocation.z + ")"
                        )
                    }
                }

                await m.edit({ embeds: [liveLocationEmbed] }).catch(() => {})

                if (!timedOut) {
                    const diff = countDownDate - Date.now(),
                          minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                          seconds = Math.floor((diff % (1000 * 60)) / 1000)
            
                    liveLocationEmbed.setFooter({ text: `Embed will timeout in: ${minutes}m ${seconds}s` })
                    setTimeout(livePosFunc, 5000)
                } else {
                    if (lastValidLocation == null || lastValidLocation == undefined) {
                        return m.edit({embeds: [
                            new Discord.EmbedBuilder()
                            .setTitle("Live Location | Timed Out")
                            .setDescription("No last known location!")
                            .setColor(Discord.Colors.DarkVividPink)
                            .setTimestamp()
                        ]}).catch(() => {})
                    }
                    else return m.edit({embeds: [
                        new Discord.EmbedBuilder()
                        .setTitle("Live Location | " + foundPlayerOld.account + " | Timed Out")
                        .setDescription(
                            "Last Known Location: \nX: " + lastValidLocation.x + "\nY: " + (lastValidLocation.y - 1) + "\nZ: " + lastValidLocation.z + 
                            "\n\nDynmap Link: " + "[" + lastValidLocation.x + ", " + lastValidLocation.z + "]" + 
                            "(https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=7&x=" + lastValidLocation.x + "&y=64&z=" + lastValidLocation.z + ")")
                        .setColor(Discord.Colors.DarkVividPink)
                        .setTimestamp()
                    ]}).catch(() => {})
                }
            }
            
            livePosFunc()
            setTimeout(() => { timedOut = true }, fiveMin)
        }     
    }
}
