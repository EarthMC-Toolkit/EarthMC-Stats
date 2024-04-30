import { CustomEmbed } from "../../bot/objects/CustomEmbed.js"

import {
    type Client, 
    type Message, 
    ButtonStyle,
    Colors,
    EmbedBuilder
} from "discord.js"

import * as fn from '../../bot/utils/fn.js'
import * as emc from "earthmc"
import * as database from "../../bot/utils/database.js"

const sendDevsOnly = (msg: Message) => msg.edit({embeds: [new EmbedBuilder()
    .setTitle("That command is for developers only!")
    .setTitle("Goofy ah :skull:")
    .setColor(Colors.Red)
    .setTimestamp()
    .setAuthor({
        name: msg.author.tag, iconURL: 
        msg.author.displayAvatarURL()
    })
]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

const editorID = "966359842417705020"
const seniorEditorID = "1143253762039873646"
const allowedChannels = ["966359699740061716"]

const devArgs = ["new", "create", "delete", "disband", "add", "remove", "set", "merge", "rename", "wizard"]

export default {
    name: "alliance",
    slashCommand: false,
    aliases: ["pacts", "submeganations", "meganations", "alliances", "a"],
    run: async (client: Client, message: Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching alliance data, this may take a moment.")
            .setColor(Colors.DarkBlue)]
        })

        const commandName = message.content.slice(2).split(' ')[0].toLowerCase(),
              cmdArray = ["alliances", "meganations", "submeganations", "pacts"]
 
        if (!req && !cmdArray.includes(commandName)) return m.edit({embeds: [
            new EmbedBuilder()
                .setTitle("Invalid command or arguments!")
                .setDescription("Usage: `n/alliance <name>`, `n/alliances` or `n/alliances search <key>`")
                .setTimestamp()
                .setColor(Colors.Red)
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        if (commandName == "submeganations") return sendAllianceList(client, message, m, args, 'sub') 
        if (commandName == "meganations") return sendAllianceList(client, message, m, args, 'mega')
        if (commandName == "pacts") return sendAllianceList(client, message, m, args, 'normal') // Normal/pacts only.

        const arg1Lower = args[0]?.toLowerCase()

        // /alliances or /alliance list
        if (commandName == "/alliances" || commandName == "alliances" || arg1Lower == "list")
            return sendAllianceList(client, message, m, args, 'all') // Includes all types.
        
        // /alliance <allianceName>
        if (args.length == 1 && arg1Lower != "list" && arg1Lower != "wizard") {
            return sendSingleAlliance(client, message, m, args)
        }
        
        if (args.length > 1) {
            // There is an argument, but not a dev one.
            if (arg1Lower && !devArgs.includes(arg1Lower)) {
                if (arg1Lower == "online") {
                    const foundAlliance = await database.Nova.getAlliance(args[1])
                    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setTitle("Error fetching alliance")
                        .setDescription("That alliance does not exist! Please try again.")
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                
                    const ops = await emc.Nova.Players.online(true)
                    const allianceOps: any = ops?.filter(op => foundAlliance.online.find(p => p == op.name)) ?? []

                    if (allianceOps.length < 1) return m.edit({embeds: [new EmbedBuilder()
                        .setColor(Colors.DarkBlue)
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
                        botembed[i] = new EmbedBuilder()
                        .setColor(Colors.DarkBlue)
                        .setTitle("Online in " + name(foundAlliance))
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setDescription("```" + allData[i] + "```")
                        .setFooter( {text: `Page ${i + 1}/${len}`, iconURL: client.user.avatarURL() })
                        .setTimestamp()
                    }

                    return await m.edit({ embeds: [botembed[0]] }).then(msg => fn.paginator(message.author.id, msg, botembed, 0))
                }
            }

            //#region Alliance editing
            if (!allowedChannels.includes(message.channel.id)) {
                return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error running command")
                    .setDescription("Alliance commands are not allowed in this channel!")
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setColor(Colors.Red)
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
            }

            const isEditor = message.member.roles.cache.has(editorID)
            if (!fn.botDevs.includes(message.author.id) && !isEditor) return sendDevsOnly(m)

            const seniorEditor = message.member.roles.cache.has(seniorEditorID)

            const arg1 = args[0]?.toLowerCase()
            const arg2 = args[1]?.toLowerCase()

            // Creating an alliance
            if (arg1 == "create" || arg1 == "new") {   
                const allianceName = args[1]
                let leaderName = "No leader set."
                
                if (args[2]) leaderName = fn.argsHelper(args, 2).asString()
                
                if (!isNaN(Number(allianceName))) {
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error creating alliance")
                        .setDescription("Alliance names cannot be numbers! Please try again.")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                }
                
                database.Nova.getAlliances().then(async alliances => {
                    const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                
                    if (foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error creating alliance")
                        .setDescription("The alliance you're trying to create already exists! Please use /alliance add.")
                        .setColor(Colors.Red)
                        .setTimestamp()
                        .setAuthor({ 
                            name: message.author.username, 
                            iconURL: message.author.displayAvatarURL() 
                        })
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
                    
                        if (leaderName == "No leader set.") return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Alliance Created")
                            .setDescription("The alliance `" + allianceName + "` has been created.\n\nNo leader has been set.")
                            .setColor(Colors.DarkBlue)
                            .setTimestamp()
                            .setAuthor({ 
                                name: message.author.username, 
                                iconURL: message.author.displayAvatarURL() 
                            })
                        ]})

                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Alliance Created")
                            .setDescription("The alliance `" + allianceName + "` has been created.\n\nLeader(s): `" + leaderName + "`")
                            .setColor(Colors.DarkBlue)
                            .setTimestamp()
                            .setAuthor({ 
                                name: message.author.username, 
                                iconURL: message.author.displayAvatarURL() 
                            })
                        ]})
                    }
                })
            } else if (arg1 == "wizard") {
                const info = fn.argsHelper(args, 1).asString().split(';')
                const allianceName = info[0]
                
                if (!allianceName) {
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error creating alliance")
                        .setDescription("Provide name when creating alliance:\n" +
                            "/a wizard <name>;<full name>;<leaders>;<nations after comma>;<type>;<discord invite>;<image link>;<fill color>;<outline color>\n" +
                            "* Values can be none, just type nothing there e.g. /a wizard UN;;;Britain,Germany (...)")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                }

                if (typeof(allianceName) == "number") {
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error creating alliance")
                        .setDescription("Alliance names cannot be numbers! Please try again.")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                }
                
                database.Nova.getAlliances().then(async alliances => {
                    const foundAlliance = alliances.some(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                    if (foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error creating alliance")
                        .setDescription("The alliance you're trying to create already exists! Please use /alliance add.")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                    const alliance = {
                        allianceName,
                        leaderName: info[2] ?? "No leader set.",
                        nations: info[3]?.split(",") ?? [],
                        type: info[4] ?? 'Normal',
                        discordInvite: info[5] ?? "No discord invite has been set for this alliance",
                        ...{
                            fullName: info[1],
                            imageURL: info[6]
                        }
                    }
    
                    const fill = info[7]
                    if (fill) {
                        alliance['colours'] = { 
                            fill, outline: info[8] ?? fill
                        }
                    }

                    alliances.push(alliance)
                    database.Nova.setAlliances(alliances)
                
                    const embed = new EmbedBuilder()
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()
                        .setAuthor({ 
                            name: message.author.username, 
                            iconURL: message.author.displayAvatarURL() 
                        })

                    return m.edit({embeds: [embed
                        .setTitle("Alliance Created")
                        .setDescription("The alliance `" + info[0] + "` has been created")
                    ]})
                })
            } else if (arg1 == "rename") {
                database.Nova.getAlliances().then(async alliances => {
                    const allianceName = args[1]
                    const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                        
                    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error renaming alliance")
                        .setDescription("The alliance you're trying to rename does not exist! Please try again.")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                    
                    const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                    m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Alliance Renamed")
                        .setDescription("The alliance ```" + foundAlliance.allianceName + "``` has been renamed to ```" + args[2] + "```")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()
                    ]})

                    foundAlliance.allianceName = args[2]
                    alliances[allianceIndex] = foundAlliance
                    
                    database.Nova.setAlliances(alliances)
                })
            } else if (arg1 == "delete" || arg1 == "disband") {
                if (isEditor && !seniorEditor) return sendDevsOnly(m)

                database.Nova.getAlliances().then(async alliances => {
                    const allianceName = args[1]
                    const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                    if (!foundAlliance) {
                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Error disbanding alliance")
                            .setDescription("The alliance you're trying to disband does not exist! Please try again.")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                    } else {
                        const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        alliances.splice(allianceIndex, 1)
                        database.Nova.setAlliances(alliances)
                    
                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Alliance Disbanded")
                            .setDescription("The alliance `" + allianceName + "` has been disbanded.")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.DarkBlue)
                            .setTimestamp()
                        ]})
                    }
                })
            }
            else if (arg1 == "add") { // Adding nation(s) to an alliance
                database.Nova.getAlliances().then(async alliances => {
                    const allianceName = args[1]
                    const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                    
                    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error updating alliance")
                        .setDescription("Unable to update that alliance as it does not exist!")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                    
                    // Remove first 2 args, then remove commas from every other argument.
                    const formattedArgs = fn.argsHelper(args, 2)
                    let nationsToAdd = formattedArgs.asArray()
                    const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                    if (nationsToAdd.includes("$override")) {
                        nationsToAdd = nationsToAdd.filter(nation => nation !== "$override")
                        foundAlliance.nations = []
                    }

                    if (!nationsToAdd) return

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

                        const allianceEmbed = new EmbedBuilder()
                            .setTitle("Alliance Updated | " + name(foundAlliance))
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setTimestamp()
                        
                        // Some nations skipped, some added.
                        const nationsSkippedLen = nationsSkipped.length

                        if (nationsSkippedLen >= 1 && nationsAdded.length >= 1) {
                            allianceEmbed.setColor(Colors.Orange).setDescription(
                                "The following nations have been added:\n\n```" + nationsAdded.join(", ") + 
                                "```\n\nThe following nations do not exist:\n\n```" + nationsSkipped.join(", ") + "```"
                            )
                        }
                        else if (nationsSkippedLen >= 1 && nationsAdded.length < 1) { // No nations added, all skipped.
                            allianceEmbed.setColor(Colors.Red)       
                                .setDescription("The following nations do not exist:\n\n```" + nationsSkipped.join(", ") + "```")
                        }
                        else if (nationsSkippedLen < 1 && nationsAdded.length >= 1) { // Nations added, none skipped.                              
                            allianceEmbed.setColor(Colors.DarkBlue)
                                .setDescription("The following nations have been added:\n\n```" + nationsAdded.join(", ") + "```")
                        }
                        if (nationsToAdd.length == 0) {
                            allianceEmbed.setColor(Colors.DarkBlue)
                                .setDescription("Nation list of the alliance has been cleared.")
                        }
                        
                        return m.edit({ embeds: [allianceEmbed] })
                    })
                })
            } else if (arg1 == "remove") {
                database.Nova.getAlliances().then(async alliances => {
                    const allianceName = args[1]
                    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                    
                    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error updating alliance")
                        .setDescription("Unable to update that alliance as it does not exist!")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

                    const formattedArgs = fn.argsHelper(args, 2)
                    const nationsToRemove = formattedArgs.asArray()

                    const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                    const nationsToRemoveLen = nationsToRemove.length
                    for (let i = 0; i < nationsToRemoveLen; i++) {
                        const currentNationToRemove = nationsToRemove[i]
                        
                        // If a nation is a number, return an error message.
                        if (!isNaN(Number(currentNationToRemove))) {
                            return m.edit({embeds: [new EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("Cannot use a number as an alliance nation! Please try again.")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Colors.Red)
                                .setTimestamp()
                            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                        }
                                        
                        const foundNation = foundAlliance.nations.find(nation => nation.toLowerCase() == currentNationToRemove.toLowerCase())
                        const foundNationIndex = foundAlliance.nations.findIndex(nation => nation.toLowerCase() == currentNationToRemove.toLowerCase())
                                            
                        // If the current nation exists in the alliance, remove it.
                        if (foundNation) foundAlliance.nations.splice(foundNationIndex, 1)
                        else nationsToRemove.splice(foundNationIndex, 1)
                    }
                
                    if (nationsToRemoveLen < 1) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error updating alliance")
                        .setDescription("None of the specified nations exist in that alliance!")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                    alliances[allianceIndex] = foundAlliance
                    database.Nova.setAlliances(alliances)

                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Alliance Updated | " + name(foundAlliance))
                        .setDescription("The following nation(s) have been removed:\n\n```" + formattedArgs.asString() + "```")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()
                    ]})
                })
            } else if (arg1 == "set") {
                if (!args[1]) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle(`Please provide a valid option for this command.\nChoices: Leader, Discord, Type or Image/Flag.`)
                    .setTimestamp()
                    .setColor(Colors.Red)
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                if (arg2 == "leader") {
                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[2]
                        const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Unable to update that alliance as it does not exist!")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                        foundAlliance.leaderName = fn.argsHelper(args, 3).asString()
                        const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        alliances[allianceIndex] = foundAlliance
                        database.Nova.setAlliances(alliances)
                        
                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Alliance Updated | " + name(foundAlliance))
                            .setDescription("The alliance leader has been set to: `" + foundAlliance.leaderName + "`")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.DarkBlue)
                            .setTimestamp()
                        ]})
                    })
                }
                else if (arg2 == "discord" || arg2 == "invite") {
                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[2]
                        const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Unable to update that alliance as it does not exist!")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                        else foundAlliance.discordInvite = args[3]

                        const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        alliances[allianceIndex] = foundAlliance
                        database.Nova.setAlliances(alliances)

                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Alliance Updated | " + name(foundAlliance))
                            .setDescription("The alliance discord link has been set to: " + args[3])
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.DarkBlue)
                            .setTimestamp()
                        ]})
                    })
                }
                else if (arg2 == "image" || arg2 == "flag") {
                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[2]
                        const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Unable to update that alliance as it does not exist!")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                        
                        foundAlliance.imageURL = args[3]
                            
                        const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        alliances[allianceIndex] = foundAlliance   
                        database.Nova.setAlliances(alliances)
                        
                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Alliance Updated | " + name(foundAlliance))
                            .setDescription("The alliance image has been set to:") 
                            .setImage(args[3])
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.DarkBlue)
                            .setTimestamp()]}).catch(() => {})
                    })
                }
                else if (arg2 == "type") { 
                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[2]
                        const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Unable to update that alliance as it does not exist!")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.Red)
                            .setTimestamp()]
                        }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                        
                        const type = args[3].toLowerCase()

                        if (type != 'sub' && type != 'normal' && type != 'mega') 
                            return m.edit({embeds: [new EmbedBuilder()
                                .setTitle("Invalid Arguments!")
                                .setDescription("Unable to set alliance type. Choose one of the following: `sub`, `mega`, `normal`")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Colors.Red)
                                .setTimestamp()]
                            }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

                        foundAlliance["type"] = type

                        const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                        alliances[allianceIndex] = foundAlliance   
                        database.Nova.setAlliances(alliances)
                        
                        const desc = type == 'sub' ? "The alliance is now a sub-meganation. :partying_face: " 
                            : type == 'mega' ? "The alliance is now a meganation! :statue_of_liberty:" 
                            : "The alliance type has been set back to normal. :pensive:"

                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Alliance Updated | " + name(foundAlliance))
                            .setDescription(desc)
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.DarkBlue)
                            .setTimestamp()]
                        }).catch(() => {})
                    })
                } else if (arg2 == "colours" || arg2 == "colors") {
                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[2]
                        const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                        if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("That alliance does not exist!")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.Red)
                            .setTimestamp()]
                        }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                        
                        foundAlliance.colours = { 
                            fill: args[3],
                            outline: args[4] ?? args[3]
                        }
                            
                        const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                        let change = `set to: \n
                            Fill: ${foundAlliance.colours.fill}\n
                            Outline: ${foundAlliance.colours.outline}`
                        if (!args[3]) {
                            change = "cleared."
                            delete alliances[allianceIndex]['colours']
                        } 
                        else alliances[allianceIndex] = foundAlliance
                        database.Nova.setAlliances(alliances)
                        
                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Alliance Updated | " + name(foundAlliance))
                            .setDescription(`The alliance colours have been ${change}`)
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.DarkBlue)
                            .setTimestamp()
                        ]}).catch(() => {})
                    })
                } else if (arg2 == "fullname" || arg2 == "label") {
                    database.Nova.getAlliances().then(async alliances => {
                        const allianceName = args[2]
                        const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                        if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("That alliance does not exist!")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Colors.Red)
                            .setTimestamp()]
                        }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                        
                        foundAlliance.fullName = args.slice(3).join(" ")
                            
                        const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                        let change = `set to: ${foundAlliance.fullName}`
                        if (!args[3]) {
                            change = "cleared."
                            delete alliances[allianceIndex]['fullName']
                        }
                        else alliances[allianceIndex] = foundAlliance
                        database.Nova.setAlliances(alliances)
                        
                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Alliance Updated | " + foundAlliance.allianceName)
                            .setDescription(`The alliance's full name has been ${change}`) 
                            .setColor(Colors.DarkBlue)
                            .setTimestamp()
                            .setAuthor({ 
                                name: message.author.username, 
                                iconURL: message.author.displayAvatarURL() 
                            })
                        ]}).catch(() => {})
                    })
                }
                else return m.edit({embeds: [new EmbedBuilder()
                    .setTitle(`${args[1]} isn't a valid option, please try again.\nChoices: Leader, Discord or Image.`)
                    .setTimestamp()
                    .setColor(Colors.Red)
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }
            else if (arg1 == "merge") {
                database.Nova.getAlliances().then(async alliances => {
                    const allianceName = args[1]
                    const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                    
                    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error updating alliance")
                        .setDescription("Unable to update that alliance as it does not exist!")
                        .setColor(Colors.Red)
                        .setTimestamp()
                        .setAuthor({ 
                            name: message.author.username, 
                            iconURL: message.author.displayAvatarURL() 
                        })
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                    //region Update alliance
                    const alliancesToMerge = args.slice(2)
                    const len = alliancesToMerge.length

                    for (let i = 0; i < len; i++) {
                        const allianceToMerge = alliancesToMerge[i]
                        
                        // If an alliance is a number, return an error message.
                        if (typeof(allianceToMerge) == "number")  return m.edit({embeds: [
                            new EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Cannot use a number as an alliance name! Please try again.")
                            .setColor(Colors.Red)
                            .setTimestamp()
                            .setAuthor({ 
                                name: message.author.username, 
                                iconURL: message.author.displayAvatarURL() 
                            })
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                    
                        const foundMergeAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceToMerge.toLowerCase())
                        if (foundMergeAlliance) foundAlliance.nations = foundAlliance.nations.concat(foundMergeAlliance.nations)
                    }

                    const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                    alliances[allianceIndex] = foundAlliance
                    database.Nova.setAlliances(alliances)
                
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Alliance Updated | " + name(foundAlliance))
                        .setDescription("The following alliances have been merged:\n\n```" + alliancesToMerge.join(", ").toString() + "```")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()
                    ]})
                })
                //endregion
            } else return m.edit({embeds: [new EmbedBuilder()
                .setTitle("Invalid Usage!")
                .setDescription("Invalid dev argument: `" + args[0] + "`")
                .setTimestamp()
                .setColor(Colors.Red)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            //#endregion
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
            
            const arg2 = args[1]?.toLowerCase()
            const arg3 = args[2]?.toLowerCase()

            //#region Sort
            // /alliances <option>
            if (!arg2) fn.defaultSortAlliance(alliances)
            else if (arg2 == "towns") {
                alliances.sort((a, b) => {
                    if (b.towns.length > a.towns.length) return 1
                    if (b.towns.length < a.towns.length) return -1
                })
            } else if (arg2 == "nations") {
                alliances.sort((a, b) => {
                    if (b.nations.length > a.nations.length) return 1
                    if (b.nations.length < a.nations.length) return -1
                })
            } else if (arg2 == "residents") {
                alliances.sort((a, b) => {
                    if (b.residents > a.residents) return 1
                    if (b.residents < a.residents) return -1
                })
            } else if (arg2 == "area" || arg2 == "chunks") {
                alliances.sort((a, b) => {
                    if (b.area > a.area) return 1
                    if (b.area < a.area) return -1
                })
            } else { // /alliances <option> <option> ... ...
                fn.defaultSortAlliance(alliances)

                if (args[0]?.toLowerCase() == "search") {
                    foundAlliances = alliances.filter(a => 
                        a.allianceName.toLowerCase() == arg2 || 
                        a.allianceName.toLowerCase().includes(arg2)
                    )

                    searching = true
                } else if (arg2 == "search") { // /alliance list search
                    foundAlliances = alliances.filter(a => 
                        a.allianceName.toLowerCase() == arg3 || 
                        a.allianceName.toLowerCase().includes(arg3)
                    )

                    searching = true
                }
            }
            //#endregion

            //#region Search or send all
            if (searching) {
                if (foundAlliances.length == 0) {
                    return m.edit({embeds: [new EmbedBuilder()
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setTitle("Searching unsuccessful")
                        .setDescription("Could not find any alliances matching that key.")
                        .setColor(Colors.Red)
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
                        botembed[i] = new EmbedBuilder()
                        .setColor(Colors.DarkBlue)
                        .setTitle("List of Alliances")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setDescription(allData[i])
                        .setTimestamp()
                        .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
                    }

                    return await m.edit({ embeds: [botembed[0]] }).then(msg => fn.paginator(message.author.id, msg, botembed, 0))
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
                    botembed[i] = new EmbedBuilder()
                    .setTitle("List of Alliances")
                    .setDescription(allData[i])
                    .setColor(Colors.DarkBlue)
                    .setTimestamp()
                    .setAuthor({ 
                        name: message.author.username, 
                        iconURL: message.author.displayAvatarURL() 
                    }).setFooter({
                        text: `Page ${i+1}/${len}`, 
                        iconURL: client.user.avatarURL()
                    })
                }

                return await m.edit({ embeds: [botembed[0]] }).then(msg => fn.paginator(message.author.id, msg, botembed, 0))
            }
            //#endregion
        })
    })
}

async function sendSingleAlliance(client, message, m, args) {
    database.Nova.getAlliance(args[0]).then(async foundAlliance => {
        if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setTitle("Error fetching alliance")
            .setDescription("That alliance does not exist! Please try again.")
            .setColor(Colors.Red)
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
            .addFields(
                fn.embedField("Leader(s)", leaders.length > 0 ? leaders.join(", ") : "None", true),
                fn.embedField("Towns", foundAlliance.towns.toString(), true),
                fn.embedField("Residents", foundAlliance.residents.toString(), true),
                fn.embedField("Type", allianceType, true),
                fn.embedField("Size", foundAlliance.area + " Chunks", true),
                fn.embedField("Online", foundAlliance.online.length.toString(), true)
            )
            .setTimestamp()
            .setThumbnail(foundAlliance.imageURL ? foundAlliance.imageURL : 'attachment://nova.png')
            .setColor(foundAlliance.colours 
                ? parseInt(foundAlliance.colours?.fill.replace('#', '0x')) 
                : Colors.DarkBlue
            )
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL() 
            })

        if (foundAlliance.discordInvite != "No discord invite has been set for this alliance") 
            allianceEmbed.setURL(foundAlliance.discordInvite)

        const thumbnail = foundAlliance.imageURL ? [] : [fn.NOVA.thumbnail]
        let nationsString = foundAlliance.nations.join(", ")

        const nationsLen = foundAlliance.nations.length
        if (nationsLen <= 0) nationsString = "There are no nations in this alliance."

        if (nationsString.length > 1024) {
            nationsString = "Too many nations to display! Click the 'view all' button to see the full list."
            allianceEmbed.addButton('view_all_nations', 'View All Nations', ButtonStyle.Primary)
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

const name = alliance => alliance.fullName ?? alliance.allianceName