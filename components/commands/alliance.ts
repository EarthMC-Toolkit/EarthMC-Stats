import { 
    OfficialAPI,
    type RawPlayerV3
} from "earthmc"

import { 
    type Client,
    type Message, 
    type TextChannel,
    ChannelType,
    ButtonStyle, Colors,
    AttachmentBuilder, EmbedBuilder
} from "discord.js"

import { request } from "undici"
import { Timestamp } from "firebase-admin/firestore"

import { CustomEmbed } from "../../bot/objects/CustomEmbed.js"

import * as database from "../../bot/utils/db/index.js"
import type { 
    AllianceType,
    DBAlliance, DBAllianceExtended
} from "../../bot/types.js"

import { 
    ArgsHelper,
    AURORA, botDevs,
    defaultSortAlliances,
    isNumeric,
    backtick, backticks,
    jsonReq, removeDuplicates,
    paginator,
    EMOJI_CHUNK,
    timestampDateTime
} from "../../bot/utils/index.js"

const successEmbed = (msg: Message) => new EmbedBuilder()
    .setColor(Colors.DarkBlue)
    .setTimestamp()
    .setAuthor({
        name: msg.author.username, 
        iconURL: msg.author.displayAvatarURL()
    })

const errorEmbed = (msg: Message) => new EmbedBuilder()
    .setColor(Colors.Red)
    .setTimestamp()
    .setAuthor({
        name: msg.author.username, 
        iconURL: msg.author.displayAvatarURL()
    })

const sendDevsOnly = (msg: Message) => msg.edit({embeds: [new EmbedBuilder()
    .setTitle("That command is for developers only!")
    .setDescription("Goofy ah :skull:")
    .setColor(Colors.Red)
    .setTimestamp()
    .setAuthor({
        name: msg.author.username, 
        iconURL: msg.author.displayAvatarURL()
    })
]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

const editorID = "966359842417705020"
const seniorEditorID = "1143253762039873646"
const allowedChannels = ["971408026516979813", "966369739679080578"]
const flagsChannel = "966372674236481606"

const getNameOrLabel = (a: { fullName?: string, allianceName: string }) => a.fullName || a.allianceName
const getType = (a: { type: string }) => a.type == 'mega' 
    ? 'Meganation' : a.type == 'sub' 
    ? 'Sub-Meganation' : 'Normal/Pact'


type UpdateStatus = 'success' | 'partial' | 'error'
type NationsInfo = {
    skipped: string[]
    added: string[]
    present?: string[]
}

const setAddedNationsInfo = (
    type: 'creating' | 'updating',
    nationsInfo: NationsInfo,
    allianceName: string,
    allianceEmbed: EmbedBuilder
) => {
    const added = nationsInfo.added.length > 0
    const skipped = nationsInfo.skipped.length > 0
    const present = (nationsInfo.present?.length ?? 0) > 0

    const descParts: string[] = []
    if (added) descParts.push("The following nations have been added:\n\n" + backticks(nationsInfo.added.join(", ")))
    if (skipped) descParts.push("The following nations were skipped as they don't exist:\n\n" + backticks(nationsInfo.skipped.join(", ")))
    if (present) descParts.push("The following nations already exist in this alliance:\n\n" + backticks(nationsInfo.present!.join(", ")))

    let status: UpdateStatus = 'error'
    if (added && !skipped && !present) status = 'success'
    else if (added) status = 'partial'
    else if (present && skipped) status = 'partial'

    const colour =
        status === 'success' ? Colors.DarkBlue :
        status === 'partial' ? Colors.Orange :
        Colors.Red

    const title = status === 'error'
        ? `Error ${type} alliance | ${allianceName}`
        : `Alliance Updated | ${allianceName}`

    allianceEmbed
        .setColor(colour)
        .setTitle(title)
        .setDescription(descParts.join("\n\n"))
}

const editorArgs = [
    "backup", "new", "create", "delete", "disband", "add", 
    "remove", "set", "merge", "rename", "wizard", "validate", "kill"
]

const subCmds = ["list", "wizard", "score"]
const cmdArray = [
    "alliances", "meganations", "submeganations", "pacts",
    "/alliances", "/meganations", "/submeganations", "/pacts"
]

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

        if (!req && !cmdArray.includes(commandName)) {
            return m.edit({embeds: [new EmbedBuilder()
                .setTitle("No Arguments Given!")
                .setDescription("Usage: `/alliance <name>`, `/alliances` or `/alliances search <key>`")
                .setTimestamp()
                .setColor(Colors.Red)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }

        if (commandName == "/submeganations" || commandName == "submeganations") return sendAllianceList(message, m, args, 'sub') 
        if (commandName == "/meganations" || commandName == "meganations") return sendAllianceList(message, m, args, 'mega')
        if (commandName == "/pacts" || commandName == "pacts") return sendAllianceList(message, m, args, 'normal') // Normal/pacts only.

        // These are subcmds after the actual /alliance or /a cmd.
        const arg1 = args[0]?.toLowerCase() // /a <arg1>
        const arg2 = args[1]?.toLowerCase() // /a <arg1> <arg2>

        // /alliances or /alliance list
        if (commandName == "/alliances" || commandName == "alliances" || arg1 == "list") {
            return sendAllianceList(message, m, args, 'all') // Includes all types.
        }
        
        // This shouldn't rly happen bc we checked empty `req`.
        if (args.length < 1) {
            return // TODO: Send error message.
        }

        // /alliance <allianceName>
        if (args.length == 1 && !subCmds.includes(arg1)) {
            const { foundAlliance } = await database.AuroraDB.getAlliance(args[0])
            if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error fetching alliance")
                .setDescription("That alliance does not exist! Please try again.")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

            const msgPayload = await allianceLookup(client, message, foundAlliance)
            return m.edit(msgPayload)
        }

        // There is an argument, but not an editor one.
        if (arg1 && !editorArgs.includes(arg1)) {
            return m.edit({embeds: [new EmbedBuilder()
                .setTitle("Invalid command!")
                .setDescription(`Usage: ${backtick(`/a <name>`)}, ${backtick(`/alliances`)} or ${backtick(`/alliances search <key>`)}`)
                .setColor(Colors.Red)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }

        //#region Alliance editing
        const isThread = message.channel.type == ChannelType.PublicThread
        if (!allowedChannels.includes(message.channel.id) && !isThread) {
            return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error running command")
                .setDescription("Alliance commands are not allowed in this channel!")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
        }

        // Correct channel, but not an editor or dev.
        const botDev = botDevs.includes(message.author.id)
        const isEditor = message.member.roles.cache.has(editorID)
        if (!botDev && !isEditor) return sendDevsOnly(m)

        const seniorEditor = message.member.roles.cache.has(seniorEditorID)

        // Checks the given alliances for non-existent nations.
        if (arg1 == "validate") {
            const { foundAlliance } = await database.AuroraDB.getAlliance(arg2)
            if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error fetching alliance")
                .setDescription("That alliance does not exist! Please try again.")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

            const nations = await database.AuroraDB.getNations()
            const existing = nations.filter(n => foundAlliance.nations.includes(n.name))

            const nationsLen = foundAlliance.nations.length
            const existingLen = existing.length

            if (existingLen == nationsLen) {
                return m.edit({embeds: [successEmbed(message)
                    .setTitle(`Alliance Validation | ${getNameOrLabel(foundAlliance)}`)
                    .setDescription(`All ${backtick(nationsLen)} nations in this alliance exist :)`)
                ]})
            }

            if (existingLen == 1) {
                return m.edit({embeds: [successEmbed(message)
                    .setTitle(`Alliance Validation | ${getNameOrLabel(foundAlliance)}`)
                    .setDescription(`Only a single nation (${existing[0].name}) exists in this alliance.\nWhere did the rest go?`)
                    .setImage("https://cdn.7tv.app/emote/01F6FTE8B80008E39HFFQJ7MWS/4x.gif") // modCheck
                ]})
            }

            if (existingLen == 0) {
                const scoobyGif = "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXVlaHVoZGRxYXBvNGNqbnFzdW5ka25zOHJmM2E1NnE4YTh3dXZxdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SRcORaJ95epQzgjLEw/giphy.gif"
                return m.edit({embeds: [successEmbed(message)
                    .setTitle(`Alliance Validation | ${getNameOrLabel(foundAlliance)}`)
                    .setDescription("What the fuck? None of the nations in this alliance even exist.\nThis is a mystery...")
                    .setImage(scoobyGif)
                ]})
            }

            const existingNations = existing.map(n => n.name)
            const missingNations = foundAlliance.nations.filter(n => !existingNations.includes(n))

            return m.edit({embeds: [successEmbed(message)
                .setTitle(`Alliance Validation | ${getNameOrLabel(foundAlliance)}`)
                .setDescription(`The following nations do not exist:\n\n${backticks(missingNations.join(", "))}`)
            ]})
        }

        // Creating an alliance
        if (arg1 == "create" || arg1 == "new") {   
            const allianceName = args[1] 
            if (isNumeric(allianceName)) {
                return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error creating alliance")
                    .setDescription("Alliance names cannot be numbers! Please try again.")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
            }
            
            const alliances = await database.AuroraDB.getAlliances()

            const foundAlliance = alliances.some(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
            if (foundAlliance) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error creating alliance")
                .setDescription("The alliance you're trying to create already exists! Please use /alliance add.")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
            
            const embed = new EmbedBuilder()
                .setTimestamp()
                .setAuthor({ 
                    name: message.author.username, 
                    iconURL: message.author.displayAvatarURL() 
                })

            const index = alliances.push({
                allianceName: allianceName,
                leaderName: "None",
                discordInvite: "No discord invite has been set for this alliance",
                nations: [] as string[],
                type: 'normal' as AllianceType,
                lastUpdated: Timestamp.now()
                //rank: alliances.length + 1
            })

            try {
                await database.AuroraDB.setAlliances(alliances, null) // TODO: No need for lastUpdated. Implement createdAt instead?
            } catch(err: any) {
                console.error(`[/a new] Error creating alliance: ${allianceName}\n${err}`)

                return m.edit({embeds: [embed
                    .setTitle("Error creating alliance")
                    .setDescription(`Could not be create the alliance due to a database issue. Please check the logs.`)
                    .setColor(Colors.Red)
                ]})
            }

            return m.edit({embeds: [embed
                .setTitle("Alliance Created")
                .setColor(Colors.DarkBlue)
                .setDescription(`
                    The alliance ${backtick(allianceName)} has been created.
                    For future reference, this alliance exists at index ${backtick(index)} in the database.
                `)
            ]})
        }
        
        if (arg1 == "wizard") {
            // TODO: Use args we already have instead of splitting and slicing content again.
            const content = message.content.split(" ")
            const info = content.slice(2).join(" ").split(';')

            //#region Pre-checks
            if (info.length < 9) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error creating alliance")
                .setDescription(
                    "Provide a command with all arguments even if they are empty, when creating alliance in following way:\n" +
                    "/a wizard <name>;<full name>;<leaders>;<nations after comma>;<type>;<discord invite>;<image link>;<fill color>;<outline color>\n" +
                    "Values except <name> can be empty, just type nothing there f.e. /a wizard UN;;;Britain,Germany;;;;;"
                )
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

            const allianceName = info[0]
            if (!allianceName) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error creating alliance")
                .setDescription("Alliance name is not provided! It is a required argument.")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

            if (isNumeric(allianceName)) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error creating alliance")
                .setDescription("Wrong alliance name! Alliance names cannot be only numeric.")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

            const typeLower = info[4]?.toLowerCase() || 'normal'
            if (typeLower != 'normal' && typeLower != 'sub' && typeLower != 'mega') {
                return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error creating alliance")
                    .setDescription("Wrong alliance type! Correct values: normal, sub, mega.")
                ]}).then(m => setTimeout(() => m.delete(), 10000))
            }

            const nationsToAdd = (info[3] || null)?.split(",") || []
            if (nationsToAdd.length == 0) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error creating alliance")
                .setDescription("No nations were specified!")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            //#endregion

            const alliances = await database.AuroraDB.getAlliances()
            
            const allianceExists = alliances.some(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
            if (allianceExists) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error creating alliance")
                .setDescription("The alliance you're trying to create already exists! This wizard can only create alliances.")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

            //#region Discord Invite
            const inviteInput = info[5]
            let discordInvite: string = null

            if (inviteInput.toLowerCase() == "none" || inviteInput.toLowerCase() == "null") {
                discordInvite = "No discord invite has been set for this alliance"
            } else {
                const inviteCode = inviteInput.split("/").pop() // Extract code from input (works if link or code)
                const inviteRes = await request(`https://discordapp.com/api/invite/${inviteCode}`)
                    .then(res => res.body.json()) as { message: string, code: number }

                // This is not the response code, but the one from the body discord gave us.
                if (inviteRes.code == 10006) return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error updating alliance")
                    .setDescription("Discord argument was not an invite code or link. Please try again.")
                ]}).then(m => setTimeout(() => m.delete(), 15000)).catch(() => {})

                discordInvite = `https://discord.gg/${inviteCode}`
            }
            //#endregion

            //#region Check if leaders exist before adding them.
            const leaderName = info[2].replaceAll(' ', '')

            // Empty or explicitly set not to have any leader(s).
            const noLeader = !leaderName || leaderName.toLowerCase() == "none" || leaderName.toLowerCase() == "null"
            if (!noLeader) {
                const { missing } = await checkPlayersExist(leaderName.split(","))
                if (missing.length > 0) {
                    return m.edit({embeds: [new EmbedBuilder()
                        .setTitle(`Failed to update alliance`)
                        .setDescription(`The following leaders do not exist:\n\n${backticks(missing.join(", "))}`)
                        .setColor(Colors.Orange)
                        .setTimestamp()
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL() 
                        })
                    ]})
                }
            }
            //#endregion

            const alliance: DBAlliance = {
                allianceName,
                leaderName: noLeader ? "None" : leaderName,
                nations: [],
                type: typeLower,
                discordInvite,
                lastUpdated: Timestamp.now(),
                // alliances.length + 1,
                ...{
                    fullName: info[1] || null,
                    imageURL: info[6] || null
                }
            }

            //#region Nations
            const nations = await database.AuroraDB.getNations()
            const nationsInfo: NationsInfo = {
                skipped: [],
                added: []
            }
            
            const len = nationsToAdd.length
            for (let i = 0; i < len; i++) {   
                const cur = nationsToAdd[i]   

                const nation = nations.find(n => n.name.toLowerCase() == cur.toLowerCase())
                if (!nation) {
                    nationsInfo.skipped.push(cur)
                    continue
                }

                const foundNation = alliance.nations.some(n => n.toLowerCase() == cur.toLowerCase())
                if (!foundNation) {
                    alliance.nations.push(nation.name)
                    nationsInfo.added.push(nation.name)
                }
            }
            //#endregion

            //#region Colors
            const fill = info[7]
            if (fill) {
                alliance.colours = { 
                    fill, outline: info[8] || fill
                }
            }
            //#endregion

            const embed = new EmbedBuilder()
                .setTimestamp()
                .setAuthor({ 
                    name: message.author.username, 
                    iconURL: message.author.displayAvatarURL() 
                })

            try {
                alliances.push(alliance)
                await database.AuroraDB.setAlliances(alliances, null) // TODO: No need for lastUpdated. Implement createdAt instead?
            } catch(err: any) {
                console.error(`[/a wizard] Error creating alliance: ${allianceName}\n${err}`)

                return m.edit({embeds: [embed
                    .setTitle("Error creating alliance")
                    .setDescription(`Could not be create the alliance due to a database issue. Please check the logs.`)
                    .setColor(Colors.Red)
                ]})
            }

            //#region Add extra info to embed if creation succeeded.
            const name = getNameOrLabel(alliance)
            embed.setTitle(`Alliance Created | ${name}`)
                .setFields({
                    name: "Leader(s)", 
                    value: leaderName == "No leader set." || leaderName == "None" 
                        ? `No leader has been set.`
                        : `Leader(s): ${backtick(leaderName)}`
                })

            setAddedNationsInfo('creating', nationsInfo, name, embed)
            //#endregion

            return m.edit({ embeds: [embed] })
        }
        
        if (arg1 == "delete" || arg1 == "disband" || arg1 == "nuke") {
            if (!botDev && !isEditor) return sendDevsOnly(m)
            if (isEditor && !seniorEditor) return m.edit({embeds: [successEmbed(message)
                .setTitle("Silly editor!")
                .setDescription("Only senior editors have permissions to delete alliances.")
                .setColor(Colors.Orange)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

            const allianceNameArg = arg2
            const alliances = await database.AuroraDB.getAlliances()

            const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceNameArg)
            if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error disbanding alliance")
                .setDescription("The alliance you're trying to disband does not exist! Please try again.")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
            
            const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceNameArg)
            const allianceName = getNameOrLabel(foundAlliance)

            // Before overwriting the alliances, create a snapshot of current alliances and send it to the backup channel.
            const backupChannel = await client.channels.fetch("1358787912946286844") as TextChannel
            if (backupChannel) {
                const reason = `Reason: **${message.author.username}** disbanded alliance ${backtick(allianceName)}.`
                await backupChannel.send({
                    content: "Successfully created a backup of alliances\n" + reason,
                    files: [createAllianceBackupFile(alliances)]
                })
            }

            alliances.splice(allianceIndex, 1)
            database.AuroraDB.setAlliances(alliances, null) // Disbanding, no need to set lastUpdated.

            return m.edit({embeds: [successEmbed(message)
                .setTitle("Alliance Disbanded")
                .setDescription(`The alliance ${backtick(allianceName)} has been disbanded.`)
            ]})
        }

        if (arg1 == "rename") {
            const allianceName = arg2
            const alliances = await database.AuroraDB.getAlliances()

            const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName)
            if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error renaming alliance")
                .setDescription("The alliance you're trying to rename does not exist! Please try again.")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

            const oldName = foundAlliance.allianceName
            const nameInput = args[2]

            if (oldName == nameInput) {
                return m.edit({embeds: [successEmbed(message)
                    .setColor(Colors.Orange)
                    .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                    .setDescription(`
                        The alliance name specified is the same as the existing one.
                        Nothing changed, but an unnecessary database write was avoided! :)
                    `)
                ]}).catch(() => {})
            }

            foundAlliance.allianceName = nameInput

            const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName)
            alliances[allianceIndex] = foundAlliance
            
            database.AuroraDB.setAlliances(alliances, [allianceIndex])

            return m.edit({embeds: [successEmbed(message)
                .setTitle("Alliance Renamed")
                .setDescription(`The alliance ${backticks(oldName)} has been renamed to ${backticks(args[2])}`)
            ]})
        }

        if (arg1 == "add") {
            const alliances = await database.AuroraDB.getAlliances()

            const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == arg2.toLowerCase())
            if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error updating alliance")
                .setDescription("Unable to update that alliance as it does not exist!")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

            // Remove first 2 args, then remove commas from every other argument.
            const formattedArgs = new ArgsHelper(args, 2)
            let nationsToAdd = formattedArgs.asArray()

            if (!nationsToAdd) {
                console.error(`Failed to add nations to ${getNameOrLabel(foundAlliance)}`)

                return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error updating alliance")
                    .setDescription("Something went wrong adding nations. <@263377802647175170>") // Ping the almighty bot owner O_O!!!1!1
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }

            if (nationsToAdd.length == 0) {
                return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error updating alliance")
                    .setDescription("No nations were specified!")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }

            if (nationsToAdd.includes("$override")) {
                nationsToAdd = nationsToAdd.filter(n => n !== "$override")
                foundAlliance.nations = []
            }

            const nations = await database.AuroraDB.getNations()
            const nationsInfo: NationsInfo = { 
                skipped: [],
                added: [],
                present: []
            }

            const len = nationsToAdd.length
            for (let i = 0; i < len; i++) {   
                const cur = nationsToAdd[i]                                              
                const nation = nations.find(n => n.name.toLowerCase() == cur.toLowerCase())

                // Invalid/non-existent nation, skip.
                if (!nation) {
                    nationsInfo.skipped.push(cur)
                    continue
                }

                // If the current nation doesn't already exist in the alliance, add it.
                const nationExists = foundAlliance.nations.some(n => n.toLowerCase() == cur.toLowerCase())
                if (!nationExists) {
                    foundAlliance.nations.push(nation.name)
                    nationsInfo.added.push(nation.name)
                } else {
                    nationsInfo.present.push(nation.name)
                }
            }

            if (nationsInfo.added.length > 0) {
                const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == arg2.toLowerCase())
                alliances[allianceIndex] = foundAlliance

                await database.AuroraDB.setAlliances(alliances, [allianceIndex])
            }
            
            const name = getNameOrLabel(foundAlliance)
            const allianceEmbed = new EmbedBuilder()
                .setTitle(`Alliance Updated | ${name}`)
                .setTimestamp()
                .setAuthor({
                    name: message.author.username,
                    iconURL: message.author.displayAvatarURL()
                })
            

            setAddedNationsInfo('updating', nationsInfo, name, allianceEmbed)
            
            return m.edit({ embeds: [allianceEmbed] })
        }
        
        if (arg1 == "remove") {
            const alliances = await database.AuroraDB.getAlliances()
            const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == arg2.toLowerCase())
            
            if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error updating alliance")
                .setDescription("Unable to update that alliance as it does not exist!")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

            const formattedArgs = new ArgsHelper(args, 2)
            const nationsToRemove = formattedArgs.asArray()

            if (!nationsToRemove) {
                console.error(`Failed to remove nations from ${getNameOrLabel(foundAlliance)}`)

                return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error updating alliance")
                    .setDescription("Something went wrong removing nations. Ping Owen.")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }

            const nationsRemoved = []
            const len = nationsToRemove.length

            for (let i = 0; i < len; i++) {
                const cur = nationsToRemove[i]
                
                if (isNumeric(cur)) {
                    return m.edit({embeds: [errorEmbed(message)
                        .setTitle("Error updating alliance")
                        .setDescription("Cannot use a number as a nation input! Please try again.")
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                }

                const foundNation = foundAlliance.nations.find(n => n.toLowerCase() == cur?.toLowerCase())
                if (!foundNation) continue

                const foundNationIndex = foundAlliance.nations.indexOf(foundNation)
                if (foundNationIndex == -1) {
                    console.log(`
                        Something went wrong getting nation ${cur} within ${foundAlliance.allianceName}.
                        Somehow we found the nation, but could not get its index.
                    `)

                    continue
                }

                // It exists, we can remove it.
                foundAlliance.nations.splice(foundNationIndex, 1)
                nationsRemoved.push(foundNation)
            }
        
            if (nationsRemoved.length < 1) return m.edit({embeds: [errorEmbed(message)
                .setTitle("Error updating alliance")
                .setDescription("None of the specified nations exist in that alliance!")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

            const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == arg2.toLowerCase())
            alliances[allianceIndex] = foundAlliance

            database.AuroraDB.setAlliances(alliances, [allianceIndex]).catch(console.error)

            return m.edit({embeds: [successEmbed(message)
                .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                .setDescription(`The following nation(s) have been removed:\n\n${backticks(nationsRemoved.join(", "))}`)
            ]})
        }
        
        // TODO: Use switch case for set options?
        if (arg1 == "set") {
            if (!arg2) return m.edit({embeds: [errorEmbed(message)
                .setTitle(`Please provide a valid option for this command.\nChoices: Leader, Discord, Type or Image/Flag.`)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            
            //#region /a set leader
            if (arg2 == "leader") {
                const alliances = await database.AuroraDB.getAlliances()
                const allianceName = args[2]

                const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error updating alliance")
                    .setDescription("Unable to update that alliance as it does not exist!")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                
                const playerArgs = new ArgsHelper(args, 3).asArray()
                const playerArgsStr = playerArgs.join(", ")

                const removing = playerArgsStr.toLowerCase() == "none" || playerArgsStr.toLowerCase() == "null"
                if (!removing) {
                    if (playerArgsStr == foundAlliance.leaderName) {
                        return m.edit({embeds: [successEmbed(message)
                            .setColor(Colors.Orange)
                            .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                            .setDescription(`
                                The alliance leaders specified are all already set.
                                Nothing changed, but an unnecessary database write was avoided! :)
                            `)
                        ]}).catch(() => {})
                    }

                    //#region Check if leaders exist when adding them.
                    const { players, missing } = await checkPlayersExist(playerArgs)
                    if (missing.length > 0) return m.edit({embeds: [new EmbedBuilder()
                        .setTitle(`Failed to update alliance`)
                        .setDescription(`The following leaders do not exist:\n\n${backticks(missing.join(", "))}`)
                        .setColor(Colors.Orange)
                        .setTimestamp()
                        .setAuthor({
                            name: message.author.username,
                            iconURL: message.author.displayAvatarURL() 
                        })
                    ]})
                    //#endregion

                    foundAlliance.leaderName = players.map(p => p.name).join(", ")
                } else {
                    foundAlliance.leaderName = "None"
                }

                const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                alliances[allianceIndex] = foundAlliance
                
                database.AuroraDB.setAlliances(alliances, [allianceIndex]).catch(console.error)
                
                return m.edit({embeds: [successEmbed(message)
                    .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                    .setDescription(`The alliance leader(s) are now: ${backtick(foundAlliance.leaderName)}`)
                ]})
            }
            //#endregion

            //#region /a set discord
            if (arg2 == "discord" || arg2 == "invite") {
                const alliances = await database.AuroraDB.getAlliances()
                const allianceName = args[2]

                const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error updating alliance")
                    .setDescription("Unable to update that alliance as it does not exist!")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                
                const inviteInput = args[3]
                if (inviteInput == foundAlliance.discordInvite) {
                    return m.edit({embeds: [successEmbed(message)
                        .setColor(Colors.Orange)
                        .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                        .setDescription(`
                            The alliance discord link specified is the same as the existing one.
                            Nothing changed, but an unnecessary database write was avoided! :)
                        `)
                    ]}).catch(() => {})
                }

                let removing = false

                if (inviteInput.toLowerCase() == "none" || inviteInput.toLowerCase() == "null") {
                    foundAlliance.discordInvite = "No discord invite has been set for this alliance"

                    removing = true
                } else {
                    const inviteCode = inviteInput.split("/").pop() // Extract code from input (works if link or code)
                    const inviteRes = await request(`https://discordapp.com/api/invite/${inviteCode}`)
                        .then(res => res.body.json()) as { message: string, code: number }

                    // This is not the response code, but the one from the body discord gave us.
                    if (inviteRes.code == 10006) return m.edit({embeds: [errorEmbed(message)
                        .setTitle("Error updating alliance")
                        .setDescription("Given input was not an invite code or link. Please try again.")
                    ]}).then(m => setTimeout(() => m.delete(), 15000)).catch(() => {})

                    foundAlliance.discordInvite = `https://discord.gg/${inviteCode}`
                }

                const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                alliances[allianceIndex] = foundAlliance

                database.AuroraDB.setAlliances(alliances, [allianceIndex]).catch(console.error)

                return m.edit({embeds: [successEmbed(message)
                    .setColor(removing ? Colors.Orange : Colors.DarkBlue)
                    .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                    .setDescription(removing ? 
                        "The discord invite for this alliance has been removed." :
                        `The discord invite for this alliance has been set to: ${foundAlliance.discordInvite}`
                    )
                ]})
            }
            //#endregion

            //#region /a set flag
            if (arg2 == "image" || arg2 == "flag") {
                const alliances = await database.AuroraDB.getAlliances()

                const allianceName = args[2]
                const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error updating alliance")
                    .setDescription("Unable to update that alliance as it does not exist!")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

                //#region Validate input
                let urlInput = args[3]
                const reset = urlInput?.toLowerCase() == "none" || urlInput?.toLowerCase() == "null"

                if (reset) urlInput = null
                else {
                    const fromFlagChannel = urlInput.includes(flagsChannel)
                    const fullSize = urlInput.startsWith("https://media.discordapp")

                    if (!fromFlagChannel || !fullSize) {
                        return m.edit({embeds: [successEmbed(message)
                            .setColor(Colors.Orange)
                            .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                            .setDescription(`Naughty editor! Read the description of the flags channel.\nMake sure to maintain the original size.`)
                            .setImage("https://cdn.7tv.app/emote/01FQ98TKT0000FX658SRNP1BXC/3x.avif") // SMH
                        ]}).catch(() => {})    
                    }
                }

                if (foundAlliance.imageURL == urlInput) {
                    return m.edit({embeds: [successEmbed(message)
                        .setColor(Colors.Orange)
                        .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                        .setDescription(`
                            The alliance image specified is the same as the existing one.
                            Nothing changed, but an unnecessary database write was avoided! :)
                        `)
                    ]}).catch(() => {})
                }
                //#endregion

                foundAlliance.imageURL = urlInput

                const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                alliances[allianceIndex] = foundAlliance

                database.AuroraDB.setAlliances(alliances, [allianceIndex])
                
                if (reset) {
                    return m.edit({embeds: [successEmbed(message)
                        .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                        .setDescription("The alliance image/flag has been removed.")
                    ]}).catch(() => {})
                }

                return m.edit({embeds: [successEmbed(message)
                    .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                    .setDescription("The alliance image/flag has been set to:") 
                    .setImage(urlInput)
                ]}).catch(() => {})
            }
            //#endregion

            //#region /a set type
            if (arg2 == "type") { 
                const alliances = await database.AuroraDB.getAlliances()

                const allianceName = args[2]
                const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error updating alliance")
                    .setDescription("Unable to update that alliance as it does not exist!")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                
                const type = args[3].toLowerCase()
                if (type != 'sub' && type != 'normal' && type != 'mega') {
                    return m.edit({embeds: [errorEmbed(message)
                        .setTitle("Invalid Arguments!")
                        .setDescription("Unable to set alliance type. Choose one of the following: `sub`, `mega`, `normal`")
                    ]}).then(m => setTimeout(() => m.delete(), 10000))
                }

                if (foundAlliance.type == type) {
                    return m.edit({embeds: [successEmbed(message)
                        .setColor(Colors.Orange)
                        .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                        .setDescription(`
                            The alliance type specified is the same as the existing one.
                            Nothing changed, but an unnecessary database write was avoided! :)
                        `)
                    ]}).catch(() => {})
                }

                foundAlliance.type = type
                const desc = type == 'sub'
                    ? "The alliance is now a sub-meganation. :partying_face: " : type == 'mega' 
                    ? "The alliance is now a meganation! :statue_of_liberty:" : "The alliance type has been set back to normal. :pensive:"

                const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                alliances[allianceIndex] = foundAlliance

                database.AuroraDB.setAlliances(alliances, [allianceIndex])
                
                return m.edit({embeds: [successEmbed(message)
                    .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                    .setDescription(desc)
                ]}).catch(() => {})
            }
            //#endregion
            
            //#region /a set colours
            if (arg2 == "colours" || arg2 == "colors") {
                const alliances = await database.AuroraDB.getAlliances()

                const allianceName = args[2]
                const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error updating alliance")
                    .setDescription("That alliance does not exist!")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                
                foundAlliance.colours = { 
                    fill: args[3],
                    outline: args[4] ?? args[3]
                }

                const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                let change = `set to:\n
                    Fill: ${foundAlliance.colours.fill}\n
                    Outline: ${foundAlliance.colours.outline}
                `

                if (!args[3]) {
                    change = "cleared."
                    delete alliances[allianceIndex].colours
                } 
                else alliances[allianceIndex] = foundAlliance

                database.AuroraDB.setAlliances(alliances, [allianceIndex])
                
                return m.edit({embeds: [successEmbed(message)
                    .setTitle(`Alliance Updated | ${getNameOrLabel(foundAlliance)}`)
                    .setDescription(`The alliance colours have been ${change}`)
                ]}).catch(() => {})                 
            }
            //#endregion
            
            //#region /a set fullname
            if (arg2 == "fullname" || arg2 == "label") {
                const alliances = await database.AuroraDB.getAlliances()

                const allianceName = args[2]
                const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                if (!foundAlliance) return m.edit({embeds: [errorEmbed(message)
                    .setTitle("Error updating alliance")
                    .setDescription("That alliance does not exist!")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                
                foundAlliance.fullName = args.slice(3).join(" ")

                const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                let change = `set to: ${backtick(foundAlliance.fullName)}`
                if (!args[3]) {
                    change = "cleared."
                    delete alliances[allianceIndex].fullName
                }
                else alliances[allianceIndex] = foundAlliance

                database.AuroraDB.setAlliances(alliances, [allianceIndex])
                
                return m.edit({embeds: [successEmbed(message)
                    .setTitle(`Alliance Updated | ${foundAlliance.allianceName}`)
                    .setDescription(`The alliance's full name has been ${change}`) 
                ]}).catch(() => {})
            }
            //#endregion

            return m.edit({embeds: [errorEmbed(message)
                .setTitle(`${args[1]} isn't a valid option, please try again.`)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }

        if (arg1 == "restore") {
            if (!botDev) return sendDevsOnly(m)
            
            const backupData = await jsonReq(arg2).catch(e => console.error(e)) as any
            if (!backupData) return m.edit({embeds: [errorEmbed(message)
                .setTitle(`\`${arg2}\` isn't a valid JSON file, please try again.`)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

            const alliances = await database.AuroraDB.getAlliances()
            const existing = new Set(alliances.map(a => a.allianceName))

            const restored = []
            for (const alliance of alliances) { 
                if (!existing.has(alliance.allianceName)) continue

                alliances.push(alliance)
                restored.push(alliance.allianceName)
            }

            await database.AuroraDB.setAlliances(alliances, null)
            
            return m.edit({embeds: [successEmbed(message)
                .setTitle("Backup Successful")
                .setDescription(`The following alliances have been restored:\n\n${backticks(restored.join(", "))}`) 
            ]}).catch(() => {})
        }
        //#endregion

        return m.edit({embeds: [errorEmbed(message)
            .setTitle("Invalid Usage!")
            .setDescription("Invalid dev argument: `" + args[0] + "`")
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
    }
}

/**
 * Removes duplicates from the input array of strings, then calls the API and returns an array of player names
 * that were missing (in the original array but not api). If none are missing, all players must exist.
 * @param leaderNames Names of players.
 */
async function checkPlayersExist(playerNames: string[]): Promise<{ players: RawPlayerV3[], missing: string[] }> {
    playerNames = removeDuplicates(playerNames)

    const players = await OfficialAPI.V3.players(...playerNames) // TODO: Maybe fall back to NPM here?
    const missing = playerNames.filter(name => !players.some(p => p.name.toLowerCase() == name.toLowerCase()))

    return { players, missing } 
}

const hasDiscord = (a: DBAlliance) => {
    if (!a.discordInvite) return false
    return a.discordInvite.startsWith("https://") && a.discordInvite.includes("discord.")
}

async function sendAllianceList(message: Message, m: Message, args: string[], type: string) {
    let alliances = await database.AuroraDB.getAlliances()
    alliances = type.toLowerCase() == 'all' ? alliances : alliances.filter(a => !!a.type && (a.type.toLowerCase() == type.toLowerCase()))

    const nations = await database.AuroraDB.getNations()
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

        alliance.residents = accumulator.residents
        alliance.area = accumulator.area
        alliance.towns = accumulator.towns
    }

    let foundAlliances: DBAlliance[] = []
    let searching = false
    
    //#region Sort
    const arg2 = args[1]?.toLowerCase()
    const arg3 = args[2]?.toLowerCase()

    let key = ""

    // /alliances <option>
    if (!arg2) defaultSortAlliances(alliances)
    if (arg2 == "towns") {
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
        const filterAlliances = (arr: DBAlliance[], key: string) => arr.filter(a => 
            a.allianceName.toLowerCase().includes(key) ||
            (a.fullName && a.fullName.toLowerCase().includes(key))
        )

        // Everything after "search" arg must be key.
        const searchArgIdx = args.findIndex(a => a.toLowerCase() == "search")
        if (searchArgIdx > -1) {
            key = args.slice(searchArgIdx + 1).join(" ").toLowerCase() // Ex: `/alliances search Union of` -> `Union of`
            if (key == "") return m.edit({embeds: [errorEmbed(message)
                .setTitle("Searching unsuccessful")
                .setDescription("No key was specified. I can't search without one :)")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            
            // At this point we have a search arg and a key, begin searching.
            foundAlliances = filterAlliances(alliances, key)
            searching = true
        }
    }
    //#endregion

    const embeds: EmbedBuilder[] = []

    //#region Search or send all
    // TODO: Maybe just place this where `searching = true` is to get rid of this check.
    if (searching) {
        if (foundAlliances.length == 0) return m.edit({embeds: [errorEmbed(message)
            .setTitle("Searching unsuccessful")
            .setDescription("Could not find any alliances matching that key.")
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        defaultSortAlliances(foundAlliances)

        // TODO: Fix the possibility where current .match logic could causes issues.
        //       If something happens to get wrapped, the alliance could span onto another page.
        const allData = foundAlliances.map((alliance, index) => {
            const nameStr = hasDiscord(alliance) 
                ? `[${getNameOrLabel(alliance)}](${alliance.discordInvite})` 
                : `**${getNameOrLabel(alliance)}**`
    
            const leaders = alliance.leaderName.split(', ').map(name => backtick(name))
            const leadersStr = leaders.length > 0 ? leaders.join(", ") : "None"
    
            return `${index + 1}. ${nameStr} (${getType(alliance)})` +
                `\nLeader(s): ${leadersStr}` + 
                `\nNations: ${backtick(alliance.nations.length)}` +
                `\nTowns: ${backtick(alliance.towns)}` +
                `\nResidents: ${backtick(alliance.residents)}` +
                `\nArea: ${backtick(Math.round(alliance.area))} Chunks`
        }).join('\n\n').match(/(?:^.*$\n\n?){1,24}/mg)
    
        const len = allData.length
        for (let i = 0; i < len; i++) {
            embeds[i] = successEmbed(message)
                .setTitle(`List of Alliances | Filtered by key: ${backtick(key)}`)
                .setDescription(allData[i])
        }

        return await m.edit({ embeds: [embeds[0]] })
            .then(msg => paginator(message.author.id, msg, embeds, 0))
    }

    const allData = alliances.map((alliance, index) => {
        const nameStr = hasDiscord(alliance) 
            ? `[${getNameOrLabel(alliance)}](${alliance.discordInvite})` 
            : `**${getNameOrLabel(alliance)}**`

        const leaders = alliance.leaderName.split(', ').map(name => backtick(name))
        const leadersStr = leaders.length > 0 ? leaders.join(", ") : "None"

        return `${index + 1}. ${nameStr} (${getType(alliance)})` +
            `\nLeader(s): ${leadersStr}` + 
            `\nNations: ${backtick(alliance.nations.length)}` +
            `\nTowns: ${backtick(alliance.towns)}` +
            `\nResidents: ${backtick(alliance.residents)}` +
            `\nArea: ${backtick(Math.round(alliance.area))} Chunks`
    }).join('\n\n').match(/(?:^.*$\n\n?){1,24}/mg)

    const len = allData.length
    for (let i = 0; i < len; i++) {
        embeds[i] = successEmbed(message)
            .setTitle("List of Alliances")
            .setDescription(allData[i])
    }

    return await m.edit({ embeds: [embeds[0]] })
        .then(msg => paginator(message.author.id, msg, embeds, 0))
    //#endregion
}

async function allianceLookup(client: Client, message: Message, foundAlliance: DBAllianceExtended) {
    const leaderNames = foundAlliance.leaderName.split(', ')
    const leaderPlayers = await OfficialAPI.V3.players(...leaderNames)

    let leadersStr = "None"

    if (!leaderPlayers) {
        // OAPI failed - fall back to just names.
        leadersStr = leaderNames.map(name => backtick(name)).join(", ")
    }
    else {
        leadersStr = leaderPlayers.length > 0 ? leaderPlayers.map(p => {
            const name = backtick(p.name)
            return !p.town?.name ? name : p.nation?.name
                ? `${name} of ${p.town.name} (**${p.nation.name}**)`
                : `${name} of ${p.town.name}`
        }).join("\n") : "None"

        // Too many characters to show leader affiliations, fall back to just names.
        if (leadersStr.length > 1024) {
            leadersStr = leaderPlayers.map(p => backtick(p.name)).join(", ")
        }
    }

    const typeString = !foundAlliance.type ? "Normal" : foundAlliance.type.toLowerCase()
    const allianceType = 
        typeString == 'sub' ? "Sub-Meganation" : 
        typeString == 'mega' ? "Meganation" : "Normal/Pact"

    const rank = foundAlliance.rank > 0 ? ` | #${foundAlliance.rank}` : ``
    
    let colour: number = Colors.DarkBlue
    const fill = foundAlliance.colours?.fill
    if (fill) {
        const fillHash = fill.startsWith("#") ? fill : "#" + fill
        colour = parseInt(fillHash.replace('#', '0x'))
    }
    
    const residentsStr = backtick(foundAlliance.residents)
    const onlineStr = backtick(foundAlliance.online?.length ?? 0)

    const allianceEmbed = new CustomEmbed(client, null, true)
        .setColor(colour)
        .setThumbnail(foundAlliance.imageURL ? foundAlliance.imageURL : 'attachment://aurora.png')
        .setBasicAuthorInfo(message.author)
        .setTitle(`Alliance Info | ${getNameOrLabel(foundAlliance)}${rank}`)
        .addField("Leader(s)", leadersStr) // Leave as is, inlining doesn't work well with multiple leaders.
        .addField("Type", backtick(allianceType)) // Leave as is since leaders can't be inlined.

        let statsStr = `Size: ${backtick(Math.round(foundAlliance.area).toLocaleString())} ${EMOJI_CHUNK}`
        statsStr += `\nTowns: ${backtick(foundAlliance.towns)}`
        statsStr += `\nResidents: ${residentsStr} / ${onlineStr} Online`

        allianceEmbed.addField("Stats", statsStr, true)

        // .addField("Size", backtick(Math.round(foundAlliance.area), { postfix: " Chunks" }), false)
        // .addField("Towns", backtick(foundAlliance.towns), true)
        // .addField("Residents", `${residentsStr} / ${onlineStr} Online`, true)

    if (foundAlliance.colours) {
        const fill = foundAlliance.colours.fill
        const outline = foundAlliance.colours.outline

        allianceEmbed.addField("Colours", 
            `Fill: ${backtick(fill ?? "Not set")}\n` +
            `Outline: ${backtick(outline ?? "Not set")}`,
            true
        )
    }

    if (foundAlliance.discordInvite != "No discord invite has been set for this alliance") {
        allianceEmbed.setURL(foundAlliance.discordInvite)
    }

    const allianceNationsLen = foundAlliance.nations.length
    const nationsStr = foundAlliance.nations
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .join(", ")

    if (nationsStr.length < 1024) {
        if (allianceNationsLen < 1) {
            allianceEmbed.addField("Nations [0]", "There are no nations in this alliance.")
        }
        else allianceEmbed.addField(`Nations [${allianceNationsLen}]`, backticks(nationsStr))
    }
    else {
        allianceEmbed.addField(
            `Nations [${allianceNationsLen}]`, 
            "Too many nations to display! Click the 'view all' button to see the full list."
        )

        allianceEmbed.addButton('view_all_nations', 'View All Nations', ButtonStyle.Primary)
    }

    if (foundAlliance.lastUpdated) {
        const formattedTs = timestampDateTime(foundAlliance.lastUpdated)
        allianceEmbed.addField("Last Updated", formattedTs)
    }

    const thumbnail = foundAlliance.imageURL ? [] : [AURORA.thumbnail]
    return {
        embeds: [allianceEmbed],
        files: thumbnail,
        components: allianceEmbed.components
    }
}

function createAllianceBackupFile(alliances: DBAlliance[]) {
    const json = JSON.stringify(alliances, null, 2) // Pretty print with 2 spaces
    const buf = Buffer.from(json)

    return new AttachmentBuilder(buf, { 
        name: `alliances-${new Date().toISOString()}.json` 
    })
}