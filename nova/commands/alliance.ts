import { CustomEmbed } from "../../bot/objects/CustomEmbed.js"

import Discord from "discord.js"
import type { Client, Message } from "discord.js"

import * as fn from '../../bot/utils/fn.js'
import * as emc from "earthmc"
import * as database from "../../bot/utils/database.js"

const editRoleID = "966359842417705020"
const allowedChannels = ["966359699740061716"]

export default {
    name: "alliance",
    slashCommand: false,
    aliases: ["pacts", "submeganations", "meganations", "alliances", "a"],
    run: async (client: Client, message: Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [new Discord.EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching alliance data, this may take a moment.")
            .setColor(Discord.Colors.DarkBlue)]
        })

        const commandName = message.content.slice(2).split(' ')[0].toLowerCase(),
              cmdArray = ["alliances", "meganations", "submeganations", "pacts"]
 
        if (!req && !cmdArray.includes(commandName)) return m.edit({embeds: [
            new Discord.EmbedBuilder()
                .setTitle("Invalid command or arguments!")
                .setDescription("Usage: `n/alliance <name>`, `n/alliances` or `n/alliances search <key>`")
                .setTimestamp()
                .setColor(Discord.Colors.Red)
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        if (commandName == "submeganations") return sendAllianceList(client, message, m, args, 'sub') 
        if (commandName == "meganations") return sendAllianceList(client, message, m, args, 'mega')
        if (commandName == "pacts") return sendAllianceList(client, message, m, args, 'normal') // Normal/pacts only.

        // /alliances or /alliance list
        if (commandName == "alliances" || (args[0] != null && args[0].toLowerCase() == "list"))
            return sendAllianceList(client, message, m, args, 'all') // Includes all types.
        
        // /alliance <allianceName>
        if (args.length == 1 && args[0].toLowerCase() != "list") return sendSingleAlliance(client, message, m, args)
        else if (args.length > 1) {
            const devArgs = ["new", "create", "delete", "disband", "add", "remove", "set", "merge", "rename"]

            // There is an argument, but not a dev one.
            if (args[0] && !devArgs.includes(args[0].toLowerCase())) {
                if (args[0].toLowerCase() == "online") {
                    const foundAlliance = await database.Nova.getAlliance(args[1])
                    if (!foundAlliance) return m.edit({embeds: [
                        new Discord.EmbedBuilder()
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setTitle("Error fetching alliance")
                            .setDescription("That alliance does not exist! Please try again.")
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                
                    const ops = await emc.Nova.Players.online(true)
                    const allianceOps: any = ops?.filter(op => foundAlliance.online.find(p => p == op.name)) ?? []

                    if (allianceOps.length < 1) return m.edit({embeds: [
                        new Discord.EmbedBuilder()
                            .setColor(Discord.Colors.DarkBlue)
                            .setTitle(`Online in ${foundAlliance.allianceName} [0]`)
                            .setDescription("No players are online in this alliance :(")
                            .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                    const botembed = []
                    const allData = allianceOps
                        .map(res => res.name + " - " + res.town + " | " + res.rank)
                        .join('\n').match(/(?:^.*$\n?){1,10}/mg)

                    let i = 0
                    const len = allData.length
                    
                    for (; i < len; i++) {
                        botembed[i] = new Discord.EmbedBuilder()
                        .setColor(Discord.Colors.DarkBlue)
                        .setTitle("Online in " + name(foundAlliance))
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setDescription("```" + allData[i] + "```")
                        .setFooter( {text: `Page ${i + 1}/${len}`, iconURL: client.user.avatarURL() })
                        .setTimestamp()
                    }

                    return await m.edit({ embeds: [botembed[0]] }).then(msg => fn.paginator(message.author.id, msg, botembed, 0))
                }
            } else {
                //#region Alliance editing
                const isEditor = allowedChannels.includes(message.channel.id) && message.member.roles.cache.has(editRoleID)
                if (!fn.botDevs.includes(message.author.id) && !isEditor) {
                    return m.edit({embeds: [new Discord.EmbedBuilder()
                        .setTitle("That command is for developers only!")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Discord.Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                }

                const arg0 = args[0]?.toLowerCase()

                // Creating an alliance
                if (arg0 == "create" || arg0 == "new") {   
                    const allianceName = args[1]
                    let leaderName = "No leader set."
                    
                    if (args[2]) leaderName = argsHelper(args, 2).asString()
                    
                    if (!isNaN(Number(allianceName))) {
                        return m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Error creating alliance")
                            .setDescription("Alliance names cannot be numbers! Please try again.")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                    }
                    
                    database.Nova.getAlliances().then(async alliances => {
                        const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                    
                        if (foundAlliance) return m.edit({embeds: [
                            new Discord.EmbedBuilder()
                                .setTitle("Error creating alliance")
                                .setDescription("The alliance you're trying to create already exists! Please use /alliance add.")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                        else {
                            alliances.push({
                                allianceName: allianceName,
                                leaderName: leaderName,
                                discordInvite: "No discord invite has been set for this alliance",
                                imageURL: null,
                                nations: [],
                                meganation: false
                            })

                            await database.Nova.setAlliances(alliances)
                        
                            if (leaderName == "No leader set.") return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                    .setTitle("Alliance Created")
                                    .setDescription("The alliance `" + allianceName + "` has been created.\n\nNo leader has been set.")
                                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                    .setColor(Discord.Colors.DarkBlue)
                                    .setTimestamp()
                            ]})
                            else return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Created")
                                .setDescription("The alliance `" + allianceName + "` has been created.\n\nLeader(s): `" + leaderName + "`")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})
                        }
                    })
                } else if (arg0 == "rename") {
                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[1],
                              foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                            
                        if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Error renaming alliance")
                            .setDescription("The alliance you're trying to rename does not exist! Please try again.")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                        
                        const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Alliance Renamed")
                            .setDescription("The alliance ```" + foundAlliance.allianceName + "``` has been renamed to ```" + args[2] + "```")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Discord.Colors.DarkBlue)
                            .setTimestamp()
                        ]})

                        foundAlliance.allianceName = args[2]
                        alliances[allianceIndex] = foundAlliance
                        
                        database.Nova.setAlliances(alliances)
                    })
                } else if (arg0 == "delete" || arg0 == "disband") {
                    if (isEditor) return

                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[1],
                              foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        if (!foundAlliance) {
                            return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                .setTitle("Error disbanding alliance")
                                .setDescription("The alliance you're trying to disband does not exist! Please try again.")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()
                            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                        } else {
                            const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances.splice(allianceIndex, 1)
                            database.Nova.setAlliances(alliances)
                        
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Disbanded")
                                .setDescription("The alliance `" + allianceName + "` has been disbanded.")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})
                        }
                    })
                }
                else if (arg0 == "add") { // Adding nation(s) to an alliance
                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[1],
                              foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                        
                        if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Unable to update that alliance as it does not exist!")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                        
                        // Remove first 2 args, then remove commas from every other argument.
                        const formattedArgs = argsHelper(args, 2)
                        const nationsToAdd = formattedArgs.asArray()
                        const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        database.Nova.getNations().then(async nations => {
                            const nationsSkipped = []
                            const nationsAdded = []
                            
                            const len = nationsToAdd.length
                            for (let i = 0; i < len; i++) {      
                                const cur = nationsToAdd[i]
                                
                                const foundNation = foundAlliance.nations.find(nation => nation.toLowerCase() == cur.toLowerCase())
                                const nation = nations.find(n => n.name.toLowerCase() == cur.toLowerCase())
        
                                if (!nation) {
                                    nationsSkipped.push(cur)
                                    continue
                                }

                                nationsAdded.push(nation.name)

                                // If the current nation doesn't already exist in the alliance, add it.
                                if (!foundNation) foundAlliance.nations.push(nation.name)
                            }

                            alliances[allianceIndex] = foundAlliance
                            database.Nova.setAlliances(alliances)

                            const allianceEmbed = new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setTimestamp()
                            
                            // Some nations skipped, some added.
                            const nationsSkippedLen = nationsSkipped.length

                            if (nationsSkippedLen >= 1 && nationsAdded.length >= 1) {
                                allianceEmbed.setColor(Discord.Colors.Orange).setDescription(
                                    "The following nations have been added:\n\n```" + nationsAdded.join(", ") + 
                                    "```\n\nThe following nations do not exist:\n\n```" + nationsSkipped.join(", ") + "```"
                                )
                            }
                            else if (nationsSkippedLen >= 1 && nationsAdded.length < 1) { // No nations added, all skipped.
                                allianceEmbed.setColor(Discord.Colors.Red)       
                                    .setDescription("The following nations do not exist:\n\n```" + nationsSkipped.join(", ") + "```")
                            }
                            else if (nationsSkippedLen < 1 && nationsAdded.length >= 1) { // Nations added, none skipped.                              
                                allianceEmbed.setColor(Discord.Colors.DarkBlue)
                                    .setDescription("The following nations have been added:\n\n```" + nationsAdded.join(", ") + "```")
                            }
                            
                            return m.edit({ embeds: [allianceEmbed] })
                        })
                    })
                } else if (arg0 == "remove") {
                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[1]
                        const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                        
                        if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Unable to update that alliance as it does not exist!")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

                        const formattedArgs = argsHelper(args, 2)
                        const nationsToRemove = formattedArgs.asArray()

                        const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        const nationsToRemoveLen = nationsToRemove.length
                        for (let i = 0; i < nationsToRemoveLen; i++) {
                            const currentNationToRemove = nationsToRemove[i]
                            
                            // If a nation is a number, return an error message.
                            if (!isNaN(Number(currentNationToRemove))) {
                                return m.edit({embeds: [
                                    new Discord.EmbedBuilder()
                                    .setTitle("Error updating alliance")
                                    .setDescription("Cannot use a number as an alliance nation! Please try again.")
                                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                    .setColor(Discord.Colors.Red)
                                    .setTimestamp()
                                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                            }
                                            
                            const foundNation = foundAlliance.nations.find(nation => nation.toLowerCase() == currentNationToRemove.toLowerCase()),
                                    foundNationIndex = foundAlliance.nations.findIndex(nation => nation.toLowerCase() == currentNationToRemove.toLowerCase())
                                                
                            // If the current nation exists in the alliance, remove it.
                            if (foundNation) foundAlliance.nations.splice(foundNationIndex, 1)
                            else nationsToRemove.splice(foundNationIndex, 1)
                        }
                    
                        if (nationsToRemoveLen < 1) return m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("None of the specified nations exist in that alliance!")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                        alliances[allianceIndex] = foundAlliance
                        database.Nova.setAlliances(alliances)

                        return m.edit({embeds: [
                            new Discord.EmbedBuilder()
                            .setTitle("Alliance Updated | " + name(foundAlliance))
                            .setDescription("The following nation(s) have been removed:\n\n```" + formattedArgs.asString() + "```")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Discord.Colors.DarkBlue)
                            .setTimestamp()
                        ]})
                    })
                } else if (arg0 == "set") {
                    if (!args[1]) return m.edit({embeds: [new Discord.EmbedBuilder()
                        .setTitle(`Please provide a valid option for this command.\nChoices: Leader, Discord, Type or Image/Flag.`)
                        .setTimestamp()
                        .setColor(Discord.Colors.Red)
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                    if (args[1].toLowerCase() == "leader") {
                        database.Nova.getAlliances().then(async alliances => {
                            const allianceName = args[2]
                            const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("Unable to update that alliance as it does not exist!")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()
                            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                                
                            foundAlliance.leaderName = argsHelper(args, 3).asString()
                            const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances[allianceIndex] = foundAlliance
                            database.Nova.setAlliances(alliances)
                            
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription("The alliance leader has been set to: `" + foundAlliance.leaderName + "`")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})
                        })
                    }
                    else if (args[1].toLowerCase() == "discord" || args[1].toLowerCase() == "invite") {
                        database.Nova.getAlliances().then(async alliances => {
                            const allianceName = args[2]
                            const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            if (!foundAlliance) return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                    .setTitle("Error updating alliance")
                                    .setDescription("Unable to update that alliance as it does not exist!")
                                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                    .setColor(Discord.Colors.Red)
                                    .setTimestamp()
                            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            else foundAlliance.discordInvite = args[3]

                            const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances[allianceIndex] = foundAlliance
                            database.Nova.setAlliances(alliances)

                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription("The alliance discord link has been set to: " + args[3])
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})
                        })
                    }
                    else if (args[1].toLowerCase() == "image" || args[1].toLowerCase() == "flag") {
                        database.Nova.getAlliances().then(async alliances => {
                            const allianceName = args[2]
                            const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("Unable to update that alliance as it does not exist!")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()
                            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                            foundAlliance.imageURL = args[3]
                                
                            const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances[allianceIndex] = foundAlliance   
                            database.Nova.setAlliances(alliances)
                            
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription("The alliance image has been set to:") 
                                .setImage(args[3])
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()]}).catch(() => {})
                        })
                    }
                    else if (args[1].toLowerCase() == "type") { 
                        database.Nova.getAlliances().then(async alliances => {
                            const allianceName = args[2]
                            const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            if (!foundAlliance) return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                    .setTitle("Error updating alliance")
                                    .setDescription("Unable to update that alliance as it does not exist!")
                                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                    .setColor(Discord.Colors.Red)
                                    .setTimestamp()]
                            }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                            const type = args[3].toLowerCase()

                            if (type != 'sub' && type != 'normal' && type != 'mega') 
                                return m.edit({embeds: [
                                    new Discord.EmbedBuilder()
                                        .setTitle("Invalid Arguments!")
                                        .setDescription("Unable to set alliance type. Choose one of the following: `sub`, `mega`, `normal`")
                                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                        .setColor(Discord.Colors.Red)
                                        .setTimestamp()]
                                }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

                            foundAlliance["type"] = type

                            const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances[allianceIndex] = foundAlliance   
                            database.Nova.setAlliances(alliances)
                            
                            const desc = type == 'sub' ? "The alliance is now a sub-meganation. :partying_face: " 
                                : type == 'mega' ? "The alliance is now a meganation! :statue_of_liberty:" 
                                : "The alliance type has been set back to normal. :pensive:"

                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription(desc)
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()]
                            }).catch(() => {})
                        })
                    } else if (args[1].toLowerCase() == "colours" || args[1].toLowerCase() == "colors") {
                        database.Nova.getAlliances().then(async alliances => {
                            const allianceName = args[2]
                            const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                            if (!foundAlliance) return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("That alliance does not exist!")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()]
                            }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                            foundAlliance.colours = { 
                                fill: args[3],
                                outline: args[4] ?? args[3]
                            }
                                
                            const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances[allianceIndex] = foundAlliance
                            database.Nova.setAlliances(alliances)
                            
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription(`The alliance colours have been set to: \n
                                    Fill: ${foundAlliance.colours.fill}\n
                                    Outline: ${foundAlliance.colours.outline}`)
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]}).catch(() => {})
                        })
                    } else if (args[1].toLowerCase() == "fullname" || args[1].toLowerCase() == "label") {
                        database.Nova.getAlliances().then(async alliances => {
                            const allianceName = args[2]
                            const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                            if (!foundAlliance) return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("That alliance does not exist!")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()]
                            }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                            foundAlliance.fullName = args.splice(3).join(" ")
                                
                            const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances[allianceIndex] = foundAlliance
                            database.Nova.setAlliances(alliances)
                            
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + foundAlliance.allianceName)
                                .setDescription(`The alliance's full name has been set to: ${foundAlliance.fullName}`) 
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()]}).catch(() => {})
                        })
                    }
                    else return m.edit({embeds: [new Discord.EmbedBuilder()
                        .setTitle(`${args[1]} isn't a valid option, please try again.\nChoices: Leader, Discord or Image.`)
                        .setTimestamp()
                        .setColor(Discord.Colors.Red)
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                }
                else if (arg0 == "merge") {
                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[1]
                        const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                        
                        if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Unable to update that alliance as it does not exist!")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                        else {
                            const alliancesToMerge = args.slice(2),
                                  len = alliancesToMerge.length

                            for (let i = 0; i < len; i++) {
                                const allianceToMerge = alliancesToMerge[i]
                                
                                // If an alliance is a number, return an error message.
                                if (!isNaN(Number(allianceToMerge))) {
                                    return m.edit({embeds: [
                                        new Discord.EmbedBuilder()
                                        .setTitle("Error updating alliance")
                                        .setDescription("Cannot use a number as an alliance name! Please try again.")
                                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                        .setColor(Discord.Colors.Red)
                                        .setTimestamp()
                                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                                }
                            
                                const foundMergeAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceToMerge.toLowerCase())
                                if (foundMergeAlliance) foundAlliance.nations = foundAlliance.nations.concat(foundMergeAlliance.nations)
                            }

                            const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances[allianceIndex] = foundAlliance
                            database.Nova.setAlliances(alliances)
                        
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription("The following alliances have been merged:\n\n```" + alliancesToMerge.join(", ").toString() + "```")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})
                        }
                    })
                } else return m.edit({embeds: [new Discord.EmbedBuilder()
                    .setTitle("Invalid Usage!")
                    .setDescription("Invalid dev argument: `" + args[0] + "`")
                    .setTimestamp()
                    .setColor(Discord.Colors.Red)
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                //#endregion
            }
        }
    }
}

async function sendAllianceList(client, message, m, args, type) {
    database.Nova.getAlliances().then(async allianceArr => { 
        return type.toLowerCase() == 'all' ? allianceArr : allianceArr.filter(a => !!a.type && (a.type.toLowerCase() == type.toLowerCase()))
    }).then(async alliances => {
        database.Nova.getNations().then(async nations => {
            alliances.forEach(alliance => {
                let allianceResidents = 0,
                    allianceArea = 0,
                    allianceTowns = 0
                
                // Add up all from an alliance's nations.
                for (const allianceNation of alliance.nations) {
                    const foundNation = nations.find(nation => nation.name == allianceNation)                       
                    if (!foundNation) continue

                    allianceResidents += foundNation.residents.length
                    allianceArea += foundNation.area
                    allianceTowns += foundNation.towns.length
                }
                    
                alliance["residents"] = allianceResidents
                alliance["towns"] = allianceTowns
                alliance["area"] = allianceArea
            })

            let foundAlliances = []
            let searching = false
            
            //#region Sort
            // /alliances <option>
            if (!args[1]) {
                // Default sort
                alliances.sort((a, b) => {
                    if (b.residents > a.residents) return 1
                    if (b.residents < a.residents) return -1
                    
                    if (b.area > a.area) return 1
                    if (b.area < a.area) return -1

                    if (b.nations.length > a.nations.length) return 1
                    if (b.nations.length < a.nations.length) return -1

                    if (b.towns.length > a.towns.length) return 1
                    if (b.towns.length < a.towns.length) return -1
                })
            } else if (args[1].toLowerCase() == "towns") {
                alliances.sort((a, b) => {
                    if (b.towns.length > a.towns.length) return 1
                    if (b.towns.length < a.towns.length) return -1
                })
            } else if (args[1].toLowerCase() == "nations") {
                alliances.sort((a, b) => {
                    if (b.nations.length > a.nations.length) return 1
                    if (b.nations.length < a.nations.length) return -1
                })
            } else if (args[1].toLowerCase() == "residents") {
                alliances.sort((a, b) => {
                    if (b.residents > a.residents) return 1
                    if (b.residents < a.residents) return -1
                })
            } else if (args[1].toLowerCase() == "area" || (args[2] != null && args[2].toLowerCase() == "chunks")) {
                alliances.sort((a, b) => {
                    if (b.area > a.area) return 1
                    if (b.area < a.area) return -1
                })
            } else { // /alliances <option> <option> ... ...
                alliances.sort((a, b) => {
                    if (b.residents > a.residents) return 1
                    if (b.residents < a.residents) return -1
                    
                    if (b.area > a.area) return 1
                    if (b.area < a.area) return -1

                    if (b.nations.length > a.nations.length) return 1
                    if (b.nations.length < a.nations.length) return -1

                    if (b.towns.length > a.towns.length) return 1
                    if (b.towns.length < a.towns.length) return -1
                })

                if (args[0] != null && args[0].toLowerCase() == "search") {
                    foundAlliances = alliances.filter(a => a.allianceName.toLowerCase() == args[1].toLowerCase() || 
                                                           a.allianceName.toLowerCase().includes(args[1].toLowerCase()))
                    searching = true
                } else if (args[1].toLowerCase() == "search") { // /alliance list search
                    foundAlliances = alliances.filter(a => a.allianceName.toLowerCase() == args[2].toLowerCase() || 
                                                           a.allianceName.toLowerCase().includes(args[2].toLowerCase()))
                    searching = true
                }
            }
            //#endregion

            //#region Search or send all
            if (searching) {
                if (foundAlliances.length == 0) {
                    return m.edit({embeds: [
                        new Discord.EmbedBuilder()
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setTitle("Searching unsuccessful")
                        .setDescription("Could not find any alliances matching that key.")
                        .setColor(Discord.Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                } else {
                    const botembed = []
                    const allData = foundAlliances.map(alliance => "**" + name(alliance) + "**" +
                        "```Leader(s): " + alliance.leaderName + 
                        "``````Nation(s): " + alliance.nations.length +
                        "``````Towns: " + alliance.towns +
                        "``````Residents: " + alliance.residents + 
                        "``````Area: " + alliance.area + 
                        "``````Discord Link: " + alliance.discordInvite + "```")
                    .join('\n').match(/(?:^.*$\n?){1,3}/mg)

                    const len = allData.length
                    for (let i = 0; i < len; i++) {
                        botembed[i] = new Discord.EmbedBuilder()
                        .setColor(Discord.Colors.DarkBlue)
                        .setTitle("List of Alliances")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setDescription(allData[i])
                        .setTimestamp()
                        .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
                    }

                    return await m.edit({embeds: [botembed[0]]}).then(msg => fn.paginator(message.author.id, msg, botembed, 0))
                }
            } else {
                const botembed = []
                const allData = alliances.map((alliance, index) => (index + 1) + ". **" + name(alliance) + "**" +
                    "```Leader(s): " + alliance.leaderName + 
                    "``````Nation(s): " + alliance.nations.length +
                    "``````Towns: " + alliance.towns +
                    "``````Residents: " + alliance.residents + 
                    "``````Area: " + alliance.area + 
                    "``````Discord Link: " + alliance.discordInvite + "```")
                .join('\n').match(/(?:^.*$\n?){1,3}/mg)

                const len = allData.length
                for (let i = 0; i < len; i++) {
                    botembed[i] = new Discord.EmbedBuilder()
                    .setColor(Discord.Colors.DarkBlue)
                    .setTitle("List of Alliances")
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                    .setDescription(allData[i])
                    .setTimestamp()
                    .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
                }

                return await m.edit({embeds: [botembed[0]]}).then(msg => fn.paginator(message.author.id, msg, botembed, 0))
            }
            //#endregion
        })
    })
}

async function sendSingleAlliance(client, message, m, args) {
    database.Nova.getAlliance(args[0]).then(async foundAlliance => {
        if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setTitle("Error fetching alliance")
            .setDescription("That alliance does not exist! Please try again.")
            .setColor(Discord.Colors.Red)
            .setTimestamp()
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
   
        const typeString = !foundAlliance.type ? "Normal" : foundAlliance.type.toLowerCase()
        const allianceType = 
            typeString == 'sub' ? "Sub-Meganation" : 
            typeString == 'mega' ? "Meganation" : "Normal"
        
        const leaderNames = foundAlliance.leaderName.split(', ')
        const players = await database.getPlayers().then(pArr =>
            pArr.filter(p => leaderNames.find(l => l.toLowerCase() == p.name.toLowerCase())) 
        ).catch(() => {})

        const leaders = []
        for (const leader of players) {
            const guildMember = await message.guild.members.fetch(leader.linkedID)

            // Leader not in guild where cmd was issued, use name to stop mention breaking.
            if (!!leader.linkedID && leader.linkedID != "" && !!guildMember) {
                leaders.push('<@' + leader.linkedID + '>')
                continue
            }

            leaders.push(leader.name.replace(/_/g, "\\_"))
        }

        const rank = foundAlliance.rank > 0 ? ` | #${foundAlliance.rank}` : ``
        const allianceEmbed = new CustomEmbed(client, `(Nova) Alliance Info | ${name(foundAlliance)}${rank}`)
            .setThumbnail(foundAlliance.imageURL ? foundAlliance.imageURL : 'attachment://nova.png')
            .setColor(foundAlliance.colours 
                ? parseInt(foundAlliance.colours?.fill.replace('#', '0x')) 
                : Discord.Colors.DarkBlue
            )
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setTimestamp()
            .addFields(
                fn.embedField("Leader(s)", leaders.length > 0 ? leaders.join(", ") : "None", true),
                fn.embedField("Towns", foundAlliance.towns.toString(), true),
                fn.embedField("Residents", foundAlliance.residents.toString(), true),
                fn.embedField("Type", allianceType, true),
                fn.embedField("Size", foundAlliance.area + " Chunks", true),
                fn.embedField("Online", foundAlliance.online.length.toString(), true)
            )

        if (foundAlliance.discordInvite != "No discord invite has been set for this alliance") 
            allianceEmbed.setURL(foundAlliance.discordInvite)

        const thumbnail = foundAlliance.imageURL ? [] : [fn.NOVA.thumbnail]
        let nationsString = foundAlliance.nations.join(", ")

        const nationsLen = foundAlliance.nations.length
        if (nationsLen <= 0) nationsString = "There are no nations in this alliance."

        if (nationsString.length > 1024) {
            nationsString = "Too many nations to display! Click the 'view all' button to see the full list."
            allianceEmbed.addButton('view_all_nations', 'View All Nations', Discord.ButtonStyle.Primary)
        }

        allianceEmbed.addFields(fn.embedField(
            "Nations [" + nationsLen + "]", 
            "```" + nationsString + "```"
        ))

        return m.edit({ 
            embeds: [allianceEmbed], 
            files: thumbnail, 
            components: allianceEmbed.components 
        })
    })
}

const name = alliance => alliance.fullName ?? alliance.allianceName,
      argsHelper = (args, spliceAmt) => ({
        original: args,
        spliced: [],
        format: function() { 
            this.spliced = this.original.splice(spliceAmt).map(e => e.replace(/,/g, ''))
            return this.spliced
        },
        asArray: function() { return this.spliced?.length < 1 ? this.format() : this.spliced },
        asString: function(delimiter = ", ") { return this.asArray().join(delimiter) }
    })