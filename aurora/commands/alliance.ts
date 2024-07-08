import { 
    type Client,
    type Message, 
    type TextChannel, 
    ButtonStyle, EmbedBuilder, Colors
} from "discord.js"

import { CustomEmbed } from "../../bot/objects/CustomEmbed.js"

import * as database from "../../bot/utils/database.js"
import type { AllianceType, DBAlliance } from "../../bot/types.js"
import { argsHelper, AURORA, botDevs, defaultSortAlliance, embedField, jsonReq, paginator } from "../../bot/utils/fn.js"
import { Aurora } from "earthmc"

const sendDevsOnly = (msg: Message) => msg.edit({embeds: [new EmbedBuilder()
    .setTitle("That command is for developers only!")
    .setTitle("Goofy ah :skull:")
    .setColor(Colors.Red)
    .setTimestamp()
    .setAuthor({
        name: msg.author.tag, 
        iconURL: msg.author.displayAvatarURL()
    })
]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

const editorID = "966359842417705020"
const seniorEditorID = "1143253762039873646"
const allowedChannels = ["971408026516979813", "966369739679080578"]

const devArgs = ["backup", "new", "create", "delete", "disband", "add", "remove", "set", "merge", "rename", "wizard"]

const getName = (a: { fullName?: string, allianceName: string }) => a.fullName ?? a.allianceName
const getType = (a: { type: string }) => a.type == 'mega' 
    ? 'Meganation' : a.type == 'sub' 
    ? 'Sub-Meganation' : 'Normal'

export default {
    name: "alliance",
    aliases: ["pacts", "submeganations", "meganations", "alliances", "a"],
    run: async (client: Client, message: Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching alliance data, this may take a moment.")
            .setColor(Colors.DarkBlue)
        ]})

        const commandName = message.content.slice(1).split(' ')[0].toLowerCase()
        const cmdArray = [
            "alliances", "meganations", "submeganations", "pacts",
            "/alliances", "/meganations", "/submeganations", "/pacts"
        ]
 
        if (!req && !cmdArray.includes(commandName)) {
            return m.edit({embeds: [new EmbedBuilder()
                .setTitle("No Arguments Given!")
                .setDescription("Usage: `/alliance <name>`, `/alliances` or `/alliances search <key>`")
                .setTimestamp()
                .setColor(Colors.Red)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }

        if (commandName == "/submeganations" || commandName == "submeganations") return sendAllianceList(client, message, m, args, 'sub') 
        if (commandName == "/meganations" || commandName == "meganations") return sendAllianceList(client, message, m, args, 'mega')
        if (commandName == "/pacts" || commandName == "pacts") return sendAllianceList(client, message, m, args, 'normal') // Normal/pacts only.

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
                if (arg1Lower != "online") return

                const foundAlliance = await database.Aurora.getAlliance(args[1])
                if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error fetching alliance")
                    .setDescription("That alliance does not exist! Please try again.")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setAuthor({
                        name: message.author.username, 
                        iconURL: message.author.displayAvatarURL()
                    })
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                const ops = await Aurora.Players.online(true).catch(() => null)
                if (!ops) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle(`Error fetching online players`)
                    .setDescription("")
                    .setColor(Colors.Red)
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                const allianceOps = ops?.filter(op => foundAlliance.online.find(p => p == op.name)) ?? []
                if (allianceOps.length < 1) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle(`Online in ${getName(foundAlliance)} [0]`)
                    .setDescription("No players are online in this alliance :(")
                    .setColor(Colors.DarkBlue)
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                const botembed = []
                const allData = allianceOps
                    .map(res => res.name + " - " + res.town + " | " + res.rank)
                    .join('\n').match(/(?:^.*$\n?){1,10}/mg)
            
                const len = allData.length
                for (let i = 0; i < len; i++) {
                    botembed[i] = new EmbedBuilder()
                    .setTitle("Online in " + getName(foundAlliance))
                    .setDescription("```" + allData[i] + "```")
                    .setColor(Colors.DarkBlue)
                    .setTimestamp()
                    .setAuthor({ 
                        name: message.author.username, 
                        iconURL: message.author.displayAvatarURL() 
                    })
                    .setFooter({ 
                        text: `Page ${i + 1}/${allData.length}`, 
                        iconURL: client.user.avatarURL() 
                    })
                }

                return await m.edit({ embeds: [botembed[0]] }).then(msg => paginator(message.author.id, msg, botembed, 0))
            }

            //#region Alliance editing
            if (!allowedChannels.includes(message.channel.id)) {
                return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error running command")
                    .setDescription("Alliance commands are not allowed in this channel!")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setAuthor({
                        name: message.author.username, 
                        iconURL: message.author.displayAvatarURL()
                    })
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
            }

            // Correct channel, but not an editor or dev.
            const isEditor = message.member.roles.cache.has(editorID)
            if (!botDevs.includes(message.author.id) && !isEditor) return sendDevsOnly(m)

            const seniorEditor = message.member.roles.cache.has(seniorEditorID)

            const arg1 = args[0]?.toLowerCase()
            const arg2 = args[1]?.toLowerCase()

            // Creating an alliance
            if (arg1 == "create" || arg1 == "new") {   
                const allianceName = args[1]
                const leaderName = !args[2] ? "No leader set." : argsHelper(args, 2).asString()
                
                if (typeof(allianceName) == "number") {
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error creating alliance")
                        .setDescription("Alliance names cannot be numbers! Please try again.")
                        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                }
                
                const alliances = await database.Aurora.getAlliances()
                const foundAlliance = alliances.some(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                
                if (foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error creating alliance")
                    .setDescription("The alliance you're trying to create already exists! Please use /alliance add.")
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                    .setColor(Colors.Red)
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                
                const alliance = {
                    allianceName: allianceName,
                    leaderName: leaderName,
                    discordInvite: "No discord invite has been set for this alliance",
                    nations: [],
                    type: 'normal' as AllianceType
                }
                
                alliances.push(alliance)
                database.Aurora.setAlliances(alliances)
            
                const embed = new EmbedBuilder()
                    .setColor(Colors.DarkBlue)
                    .setTimestamp()
                    .setAuthor({ 
                        name: message.author.username, 
                        iconURL: message.author.displayAvatarURL() 
                    })

                if (leaderName == "No leader set.") return m.edit({embeds: [embed
                    .setTitle("Alliance Created")
                    .setDescription("The alliance `" + allianceName + "` has been created.\n\nNo leader has been set.")
                ]})

                return m.edit({embeds: [embed
                    .setTitle("Alliance Created")
                    .setDescription("The alliance `" + allianceName + "` has been created.\n\nLeader(s): `" + leaderName + "`")
                ]})
            } 
            
            if (arg1 == "wizard") {
                const info = arg2.split(';')
                const allianceName = info[0]
                
                if (!allianceName) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error creating alliance")
                    .setDescription(
                        "Provide name when creating alliance:\n" +
                        "/a wizard <name>;<full name>;<leaders>;<nations after comma>;<type>;<discord invite>;<image link>;<fill color>;<outline color>\n" +
                        "* Values can be none, just type nothing there e.g. /a wizard UN;;;Britain,Germany (...)"
                    )
                    .setAuthor({
                        name: message.author.username,
                        iconURL: message.author.displayAvatarURL()
                    })
                    .setColor(Colors.Red)
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

                if (typeof(allianceName) == "number") return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error creating alliance")
                    .setDescription("Alliance names cannot be numbers! Please try again.")
                    .setAuthor({
                        name: message.author.username,
                        iconURL: message.author.displayAvatarURL()
                    })
                    .setColor(Colors.Red)
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

                const alliances = await database.Aurora.getAlliances()
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
                    type: (info[4] ?? 'normal') as AllianceType,
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
                database.Aurora.setAlliances(alliances)
            
                return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Alliance Created")
                    .setDescription(`The alliance \`${allianceName}\` has been created`)
                    .setColor(Colors.DarkBlue)
                    .setTimestamp()
                    .setAuthor({ 
                        name: message.author.username, 
                        iconURL: message.author.displayAvatarURL() 
                    })
                ]})
            } 
            
            if (arg1 == "rename") {
                const alliances = await database.Aurora.getAlliances()

                const allianceName = arg2
                const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName)

                if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error renaming alliance")
                    .setDescription("The alliance you're trying to rename does not exist! Please try again.")
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                    .setColor(Colors.Red)
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName)

                foundAlliance.allianceName = args[2]
                alliances[allianceIndex] = foundAlliance
                
                database.Aurora.setAlliances(alliances)

                return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Alliance Renamed")
                    .setDescription("The alliance ```" + foundAlliance.allianceName + "``` has been renamed to ```" + args[2] + "```")
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                    .setColor(Colors.DarkBlue)
                    .setTimestamp()
                ]})
            }
            
            if (arg1 == "delete" || arg1 == "disband") {
                if (isEditor && !seniorEditor) return sendDevsOnly(m)

                const alliances = await database.Aurora.getAlliances()

                const allianceName = arg2
                const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName)

                if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error disbanding alliance")
                    .setDescription("The alliance you're trying to disband does not exist! Please try again.")
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setColor(Colors.Red)
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

                const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName)

                alliances.splice(allianceIndex, 1)
                database.Aurora.setAlliances(alliances)
            
                return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Alliance Disbanded")
                    .setDescription("The alliance `" + getName(foundAlliance) + "` has been disbanded.")
                    .setColor(Colors.DarkBlue)
                    .setTimestamp()
                    .setAuthor({
                        name: message.author.username,
                        iconURL: message.author.displayAvatarURL()
                    })
                ]})
            }
            
            if (arg1 == "add") { // Adding nation(s) to an alliance      
                const alliances = await database.Aurora.getAlliances()

                const allianceName = arg2
                const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                
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

                // Remove first 2 args, then remove commas from every other argument.
                const formattedArgs = argsHelper(args, 2)
                let nationsToAdd = formattedArgs.asArray()

                if (nationsToAdd.includes("$override")) {
                    nationsToAdd = nationsToAdd.filter(nation => nation !== "$override")
                    foundAlliance.nations = []
                }

                if (!nationsToAdd) return
                if (nationsToAdd.length == 0) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error updating alliance")
                    .setDescription("No nations were specified!")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setAuthor({
                        name: message.author.username,
                        iconURL: message.author.displayAvatarURL()
                    })
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                const nations = await database.Aurora.getNations()

                const nationsSkipped = []
                const nationsAdded = []
                const len = nationsToAdd.length

                for (let i = 0; i < len; i++) {   
                    const cur = nationsToAdd[i]                                              
                    const nation = nations.find(n => n.name.toLowerCase() == cur.toLowerCase())

                    if (!nation) {
                        nationsSkipped.push(cur)
                        continue
                    }

                    nationsAdded.push(nation.name)

                    // If the current nation doesn't already exist in the alliance, add it.
                    const foundNation = foundAlliance.nations.find(nation => nation.toLowerCase() == cur.toLowerCase())
                    if (!foundNation) foundAlliance.nations.push(nation.name)
                }

                const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                alliances[allianceIndex] = foundAlliance

                database.Aurora.setAlliances(alliances)

                const allianceEmbed = new EmbedBuilder()
                    .setTitle(`Alliance Updated | ${getName(foundAlliance)}`)
                    .setTimestamp()
                    .setAuthor({
                        name: message.author.username,
                        iconURL: message.author.displayAvatarURL()
                    })
                
                // Some nations skipped, some added.
                if (nationsSkipped.length >= 1 && nationsAdded.length >= 1) {
                    allianceEmbed.setColor(Colors.Orange).setDescription(
                        "The following nations have been added:\n\n```" + nationsAdded.join(", ") + 
                        "```\n\nThe following nations do not exist:\n\n```" + nationsSkipped.join(", ") + "```"
                    )
                }
                else if (nationsSkipped.length >= 1 && nationsAdded.length < 1) { // No nations added, all skipped.          
                    allianceEmbed.setColor(Colors.Red)
                        .setTitle(`Error updating alliance | ${getName(foundAlliance)}`)
                        .setDescription("The following nations do not exist:\n\n```" + nationsSkipped.join(", ") + "```")
                }
                else if (nationsSkipped.length < 1 && nationsAdded.length >= 1) { // Nations added, none skipped.
                    allianceEmbed.setColor(Colors.DarkBlue)
                        .setDescription("The following nations have been added:\n\n```" + nationsAdded.join(", ") + "```")
                }
                
                return m.edit({ embeds: [allianceEmbed] })
            } 
            
            if (arg1 == "remove") {
                const alliances = await database.Aurora.getAlliances()

                const allianceName = arg2
                const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                
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

                const formattedArgs = argsHelper(args, 2)
                const nationsToRemove = formattedArgs.asArray() as any[]
                const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                
                if (!nationsToRemove) {
                    console.log(`Failed to remove nations from ${getName(foundAlliance)}`)
                    return
                }

                console.log(nationsToRemove.toString())
                const len = nationsToRemove.length
                
                for (let i = 0; i < len; i++) {
                    const cur = nationsToRemove[i]
                    
                    // If a nation is a number, return an error message.
                    if (typeof(cur) == "number") {
                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Cannot use a number as an alliance nation! Please try again.")
                            .setColor(Colors.Red)
                            .setTimestamp()
                            .setAuthor({ 
                                name: message.author.username, 
                                iconURL: message.author.displayAvatarURL() 
                            })
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                    }

                    const foundAllianceNations = foundAlliance.nations as any[]
                    const lower = cur?.toLowerCase()

                    const foundNation = foundAllianceNations.find(nation => nation.toLowerCase() == lower)
                    const foundNationIndex = foundAllianceNations.findIndex(nation => nation.toLowerCase() == lower)
                                        
                    // If the current nation exists in the alliance, remove it.
                    if (foundNation) foundAllianceNations.splice(foundNationIndex, 1)
                    else nationsToRemove.splice(foundNationIndex, 1)
                }
            
                if (nationsToRemove.length < 1) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error updating alliance")
                    .setDescription("None of the specified nations exist in that alliance!")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setAuthor({ 
                        name: message.author.username, 
                        iconURL: message.author.displayAvatarURL() 
                    })
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                alliances[allianceIndex] = foundAlliance
                database.Aurora.setAlliances(alliances)

                return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Alliance Updated | " + getName(foundAlliance))
                    .setDescription("The following nation(s) have been removed:\n\n```" + formattedArgs.asString() + "```")
                    .setColor(Colors.DarkBlue)
                    .setTimestamp()
                    .setAuthor({ 
                        name: message.author.username, 
                        iconURL: message.author.displayAvatarURL() 
                    })
                ]})
            } 
            
            if (arg1 == "set") {
                if (!arg2) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle(`Please provide a valid option for this command.\nChoices: Leader, Discord, Type or Image/Flag.`)
                    .setTimestamp()
                    .setColor(Colors.Red)
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                
                if (arg2 == "leader") {
                    const alliances = await database.Aurora.getAlliances()

                    const allianceName = args[2]
                    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

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
                    
                    foundAlliance.leaderName = argsHelper(args, 3).asString()
                    const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                    alliances[allianceIndex] = foundAlliance
                    database.Aurora.setAlliances(alliances)
                    
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Alliance Updated | " + getName(foundAlliance))
                        .setDescription("The alliance leader has been set to: `" + foundAlliance.leaderName + "`")
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL() 
                        })
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()
                    ]})
                }

                if (arg2 == "discord" || arg2 == "invite") {
                    const alliances = await database.Aurora.getAlliances()
                    const allianceName = args[2]
                    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error updating alliance")
                        .setDescription("Unable to update that alliance as it does not exist!")
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                    
                    const inviteInput = args[3]
                    if (!inviteInput.startsWith("https://discord.gg")) {
                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("That invite is not valid. Make sure it begins with `https://discord.gg`.")
                            .setAuthor({
                                name: message.author.username,
                                iconURL: message.author.displayAvatarURL()
                            })
                            .setColor(Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                    }

                    foundAlliance.discordInvite = inviteInput

                    const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                    alliances[allianceIndex] = foundAlliance

                    database.Aurora.setAlliances(alliances)

                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Alliance Updated | " + getName(foundAlliance))
                        .setDescription("The alliance discord link has been set to: " + inviteInput)
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()
                    ]})
                }
                
                if (arg2== "image" || arg2 == "flag") {
                    const alliances = await database.Aurora.getAlliances()

                    const allianceName = args[2]
                    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error updating alliance")
                        .setDescription("Unable to update that alliance as it does not exist!")
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setColor(Colors.Red)
                        .setTimestamp()]
                    }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                    
                    foundAlliance.imageURL = args[3]
                        
                    const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                    alliances[allianceIndex] = foundAlliance   

                    database.Aurora.setAlliances(alliances)
                    
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Alliance Updated | " + getName(foundAlliance))
                        .setDescription("The alliance image has been set to:") 
                        .setImage(args[3])
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()
                    ]}).catch(() => {})
                }
                else if (arg2 == "type") { 
                    const alliances = await database.Aurora.getAlliances()

                    const allianceName = args[2]
                    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error updating alliance")
                        .setDescription("Unable to update that alliance as it does not exist!")
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setColor(Colors.Red)
                        .setTimestamp()]
                    }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                    
                    const type = args[3].toLowerCase()
                    if (type != 'sub' && type != 'normal' && type != 'mega') return m.edit({embeds: [
                        new EmbedBuilder()
                        .setTitle("Invalid Arguments!")
                        .setDescription("Unable to set alliance type. Choose one of the following: `sub`, `mega`, `normal`")
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

                    foundAlliance["type"] = type
                    const desc = type == 'sub'
                        ? "The alliance is now a sub-meganation. :partying_face: " : type == 'mega' 
                        ? "The alliance is now a meganation! :statue_of_liberty:" : "The alliance type has been set back to normal. :pensive:"

                    const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                    alliances[allianceIndex] = foundAlliance   
                    database.Aurora.setAlliances(alliances)
                    
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Alliance Updated | " + getName(foundAlliance))
                        .setDescription(desc)
                        .setAuthor({
                            name: message.author.username, 
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()]
                    }).catch(() => {})
                } else if (arg2 == "colours" || arg2 == "colors") {
                    const alliances = await database.Aurora.getAlliances()

                    const allianceName = args[2]
                    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error updating alliance")
                        .setDescription("That alliance does not exist!")
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setColor(Colors.Red)
                        .setTimestamp()]
                    }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                    
                    foundAlliance.colours = { 
                        fill: args[3],
                        outline: args[4] ?? args[3]
                    }

                    const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                    let change = `set to: \n
                        Fill: ${foundAlliance.colours.fill}\n
                        Outline: ${foundAlliance.colours.outline}`
                    if (!args[3]) {
                        change = "cleared."
                        delete alliances[allianceIndex]['colours']
                    } 
                    else alliances[allianceIndex] = foundAlliance

                    database.Aurora.setAlliances(alliances)
                    
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Alliance Updated | " + getName(foundAlliance))
                        .setDescription(`The alliance colours have been ${change}`)
                        .setAuthor({
                            name: message.author.username, 
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()
                    ]}).catch(() => {})                 
                }
                
                if (arg2 == "fullname" || arg2 == "label") {
                    const alliances = await database.Aurora.getAlliances()

                    const allianceName = args[2]
                    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Error updating alliance")
                        .setDescription("That alliance does not exist!")
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setColor(Colors.Red)
                        .setTimestamp()]
                    }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                    
                    foundAlliance.fullName = args.slice(3).join(" ")
                        
                    const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                    let change = `set to: ${foundAlliance.fullName}`
                    if (!args[3]) {
                        change = "cleared."
                        delete alliances[allianceIndex]['fullName']
                    }
                    else alliances[allianceIndex] = foundAlliance

                    database.Aurora.setAlliances(alliances)
                    
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle("Alliance Updated | " + foundAlliance.allianceName)
                        .setDescription(`The alliance's full name has been ${change}`) 
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()
                    ]}).catch(() => {})
                }
                
                return m.edit({embeds: [new EmbedBuilder()
                    .setTitle(`${args[1]} isn't a valid option, please try again.`)
                    .setTimestamp()
                    .setColor(Colors.Red)
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }

            if (arg1 == "merge") {
                const alliances = await database.Aurora.getAlliances()

                const allianceName = arg2
                const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                
                if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Error updating alliance")
                    .setDescription("Unable to update that alliance as it does not exist!")
                    .setAuthor({
                        name: message.author.username,
                        iconURL: message.author.displayAvatarURL()
                    })
                    .setColor(Colors.Red)
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                
                const alliancesToMerge = args.slice(2)
                const alliancesLen = alliancesToMerge.length
                
                for (let i = 0; i < alliancesLen; i++) {
                    const allianceToMerge = alliancesToMerge[i]
                    
                    // If an alliance is a number, return an error message.
                    if (!isNaN(Number(allianceToMerge))) {
                        return m.edit({embeds: [new EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Cannot use a number as an alliance name! Please try again.")
                            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                            .setColor(Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                    }
                
                    const foundMergeAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceToMerge.toLowerCase())
                    if (foundMergeAlliance) foundAlliance.nations = foundAlliance.nations.concat(foundMergeAlliance.nations)
                }

                const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                alliances[allianceIndex] = foundAlliance
                database.Aurora.setAlliances(alliances)
            
                return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Alliance Updated | " + getName(foundAlliance))
                    .setDescription("The following alliances have been merged:\n\n```" + alliancesToMerge.join(", ").toString() + "```")
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setColor(Colors.DarkBlue)
                    .setTimestamp()
                ]})
            }

            if (arg1 == "backup") {
                if (isEditor) return sendDevsOnly(m)
                
                const backupData = await jsonReq(arg2).catch(e => console.error(e)) as any
                if (!backupData) return m.edit({embeds: [new EmbedBuilder()
                    .setTitle(`\`${arg2}\` isn't a valid JSON file, please try again.`)
                    .setTimestamp()
                    .setColor(Colors.Red)
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                const len = backupData.length
                const restored = []
                
                const alliances = await database.Aurora.getAlliances()

                for (let i = 0; i < len; i++) { 
                    const alliance = backupData[i]
                    const exists = alliances.some(a => a.allianceName == alliance.allianceName)
                    
                    if (exists) {
                        alliances.push(alliance)
                        restored.push(alliance.allianceName)
                    }
                }

                await database.Aurora.setAlliances(alliances)
                        
                return m.edit({embeds: [new EmbedBuilder()
                    .setTitle("Backup Successful")
                    .setDescription('The following alliances have been restored:\n\n```' + restored.join(", ") + '```') 
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setColor(Colors.DarkBlue)
                    .setTimestamp()
                ]}).catch(() => {})
            }
            
            return m.edit({embeds: [new EmbedBuilder()
                .setTitle("Invalid Usage!")
                .setDescription("Invalid dev argument: `" + args[0] + "`")
                .setTimestamp()
                .setColor(Colors.Red)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            //#endregion
        }
    }
}

async function sendAllianceList(client: Client, message: Message, m, args: string[], type: string) {
    let alliances = await database.Aurora.getAlliances()
    alliances = type.toLowerCase() == 'all' ? alliances : alliances.filter(a => !!a.type && (a.type.toLowerCase() == type.toLowerCase()))

    const nations = await database.Aurora.getNations()
    const alliancesLen = alliances.length

    for (let i = 0; i < alliancesLen; i++) {
        const alliance = alliances[i]

        const accumulator = alliance.nations.reduce((acc, allianceNation) => {
            const foundNation = nations.find(nation => nation.name === allianceNation)
            if (foundNation) {
                acc.residents += foundNation.residents.length
                acc.towns += foundNation.towns.length
                acc.area += foundNation.area
            }

            return acc
        }, { residents: 0, area: 0, towns: 0 })

        alliance["residents"] = accumulator.residents
        alliance["area"] = accumulator.area
        alliance["towns"] = accumulator.towns
    }

    let foundAlliances = []
    let searching = false
    
    //#region Sort
    const arg2 = args[1]?.toLowerCase()
    const arg3 = args[2]?.toLowerCase()

    // /alliances <option>
    if (!arg2) defaultSortAlliance(alliances)
    else if (arg2 == "towns") {
        alliances.sort((a, b) => {
            if (b.towns > a.towns) return 1
            if (b.towns < a.towns) return -1
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
    } else if (arg2 == "area" || (arg3 && arg3 == "chunks")) {
        alliances.sort((a, b) => {
            if (b.area > a.area) return 1
            if (b.area < a.area) return -1
        })
    } else { // /alliances <option> <option> ... ...
        defaultSortAlliance(alliances)

        const arg1 = args[0]?.toLowerCase()
        const filterAlliances = (arr: DBAlliance[], key: string) => 
            arr.filter(a => a.allianceName.toLowerCase().includes(key))

        if (arg1 && arg1 == "search") {
            foundAlliances = filterAlliances(alliances, arg2)
            searching = true
        } else if (arg2 == "search") { // /alliance list search
            foundAlliances = filterAlliances(alliances, arg3)
            searching = true
        }
    }
    //#endregion

    const botEmbed = []

    //#region Search or send all
    if (searching) {
        if (foundAlliances.length == 0) return m.edit({embeds: [new EmbedBuilder()
            .setTitle("Searching unsuccessful")
            .setDescription("Could not find any alliances matching that key.")
            .setColor(Colors.Red)
            .setTimestamp()
            .setAuthor({
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL()
            })
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const allData = foundAlliances.map(alliance => 
            "**" + getName(alliance) + "**" + " (" + getType(alliance) + ")" +
            "```Leader(s): " + alliance.leaderName + 
            "``````Nation(s): " + alliance.nations.length +
            "``````Towns: " + alliance.towns +
            "``````Residents: " + alliance.residents + 
            "``````Area: " + alliance.area + 
            "``````Discord Link: " + alliance.discordInvite + "```").join('\n').match(/(?:^.*$\n?){1,3}/mg)

        const len = allData.length
        for (let i = 0; i < len; i++) {
            botEmbed[i] = new EmbedBuilder()
            .setColor(Colors.DarkBlue)
            .setTitle("List of Alliances")
            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
            .setDescription(allData[i])
            .setTimestamp()
            .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
        }

        return await m.edit({ embeds: [botEmbed[0]] })
            .then(msg => paginator(message.author.id, msg, botEmbed, 0))
    }

    const allData = alliances.map((alliance, index) => 
        (index + 1) + ". **" + getName(alliance) + "**" + " (" + getType(alliance) + ")" +
        "```Leader(s): " + alliance.leaderName + 
        "``````Nation(s): " + alliance.nations.length +
        "``````Towns: " + alliance.towns +
        "``````Residents: " + alliance.residents + 
        "``````Area: " + alliance.area + 
        "``````Discord Link: " + alliance.discordInvite + "```").join('\n').match(/(?:^.*$\n?){1,3}/mg)

    const len = allData.length
    for (let i = 0; i < len; i++) {
        botEmbed[i] = new EmbedBuilder()
        .setColor(Colors.DarkBlue)
        .setTitle("List of Alliances")
        .setDescription(allData[i])
        .setTimestamp()
        .setAuthor({
            name: message.author.username, 
            iconURL: message.author.displayAvatarURL()
        })
        .setFooter({
            text: `Page ${i+1}/${len}`, 
            iconURL: client.user.avatarURL()
        })
    }

    return await m.edit({ embeds: [botEmbed[0]] }).then(msg => paginator(message.author.id, msg, botEmbed, 0))
    //#endregion
}

async function sendSingleAlliance(
    client: Client, 
    message: Message, 
    m: Message, 
    args: string[]
) {
    const foundAlliance = await database.Aurora.getAlliance(args[0])
    if (!foundAlliance) return m.edit({embeds: [new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        .setTitle("Error fetching alliance")
        .setDescription("That alliance does not exist! Please try again.")
        .setColor(Colors.Red)
        .setTimestamp()
    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

    const leaderNames = foundAlliance.leaderName.split(', ')
    const players = await database.getPlayers().then(arr => arr.filter(p => 
        leaderNames.find(l => l.toLowerCase() == p.name.toLowerCase())
    ))

    if (!players) return m.edit({embeds: [new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        .setTitle("Database error occurred")
        .setDescription("Failed to fetch players needed for this command to work.")
        .setColor(Colors.Red)
        .setTimestamp()
    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

    const typeString = !foundAlliance.type ? "Normal" : foundAlliance.type.toLowerCase()
    const allianceType = 
        typeString == 'sub' ? "Sub-Meganation" : 
        typeString == 'mega' ? "Meganation" : "Normal"
    
    const playersLen = players.length
    const leaders = []

    for (let i = 0; i < playersLen; i++) {
        const leader = players[i]
        const leaderID = leader.linkedID

        if (leaderID) {
            const members = (message.channel as TextChannel).members
            if (members.get(leaderID)) {
                // Leader can view channel where command was issued, use mention.
                leaders.push(`<@${leaderID}>`)
                continue
            }
        }

        leaders.push(leader.name.replace(/_/g, "\\_"))
    }
    
    const rank = foundAlliance.rank > 0 ? ` | #${foundAlliance.rank}` : ``
    const leadersStr = leaders.length > 0 ? leaders.join(", ") : "None"

    const allianceEmbed = new CustomEmbed(client, `(Aurora) Alliance Info | ${getName(foundAlliance)}${rank}`)
        .addFields(
            embedField("Leader(s)", leadersStr, false),
            embedField("Type", allianceType, true),
            //embedField("Wealth", `\`${foundAlliance.wealth}\`G`, true),
            embedField("Size", `\`${foundAlliance.area}\` Chunks`, true),
            embedField("Towns", foundAlliance.towns.toString(), true),
            embedField("Residents", foundAlliance.residents.toString(), true),
            embedField("Online", foundAlliance.online.length.toString(), true)
        )
        .setColor(foundAlliance.colours 
            ? parseInt(foundAlliance.colours?.fill.replace('#', '0x')) 
            : Colors.DarkBlue
        )
        .setThumbnail(foundAlliance.imageURL ? foundAlliance.imageURL : 'attachment://aurora.png')
        .setDefaultAuthor(message)
        .setTimestamp()

    if (foundAlliance.discordInvite != "No discord invite has been set for this alliance") 
        allianceEmbed.setURL(foundAlliance.discordInvite)
    
    const thumbnail = foundAlliance.imageURL ? [] : [AURORA.thumbnail]
    const nationsString = foundAlliance.nations.join(", ")

    const allianceNationsLen = foundAlliance.nations.length
    if (nationsString.length < 1024) {
        if (allianceNationsLen <= 0) {
            allianceEmbed.addFields(embedField("Nations [0]", "There are no nations in this alliance."))
        }
        else allianceEmbed.addFields(embedField(
            `Nations [${allianceNationsLen}]`, 
            "```" + nationsString + "```"
        ))
    }
    else {
        allianceEmbed.addFields(embedField(
            `Nations [${allianceNationsLen}]`, 
            "Too many nations to display! Click the 'view all' button to see the full list."
        ))

        allianceEmbed.addButton('view_all_nations', 'View All Nations', ButtonStyle.Primary)
    }

    return m.edit({
        embeds: [allianceEmbed],
        files: thumbnail,
        components: allianceEmbed.components
    })
}