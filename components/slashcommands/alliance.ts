import { OfficialAPI } from "earthmc"

import {
    Colors, ButtonStyle,
    EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import type {
    ChatInputCommandInteraction
} from "discord.js"

import { 
    database, AURORA,
    backtick, backticks,
    timestampDateTime
} from '../../bot/utils/index.js'

import CustomEmbed from "../../bot/objects/CustomEmbed.js"
import type { DBAlliance, SlashCommand } from "../../bot/types.js"

//const editingChannels = ["971408026516979813"]
//const editorRole = "966359842417705020"

// TODO: Does this work in DMs since we cast to GuildMember ?
// const checkEditor = async (interaction: ChatInputCommandInteraction) => {
//     const author = interaction.member as GuildMember
//     const isEditor = editingChannels.includes(interaction.channelId) && author.roles.cache.has(editorRole)

//     if (!botDevs.includes(author.id) && !isEditor) interaction.reply({embeds: [new EmbedBuilder()
//         .setTitle("That command is for editors only!\nIf you are an editor, you're probably in the wrong channel.")
//         .setColor(Colors.Red)
//         .setTimestamp()
//         .setAuthor({
//             name: author.user.username,
//             iconURL: author.displayAvatarURL()
//         })
//     ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
// }

const getNameOrLabel = (a: { fullName?: string, allianceName: string }) => a.fullName || a.allianceName

const errorEmbed = (interaction: ChatInputCommandInteraction) => new EmbedBuilder()
    .setColor(Colors.Red)
    .setTimestamp()
    .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
    })

const desc = "Command for all things alliance related. Lookup, editing etc."
const cmdData = new SlashCommandBuilder()
    .setName("alliance")
    .setDescription(desc)
    .addSubcommand(subCmd => subCmd.setName("lookup")
        .setDescription("Get information on an existing alliance.")
        .addStringOption(opt => opt.setName("name")
            .setDescription("The colloquial/short name of the alliance to lookup.")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    // .addSubcommand(subCmd => subCmd.setName('create').setDescription('Create a new alliance.')
    //     .addStringOption(option => option.setName("map")
    //         .setDescription("Choose a map this new alliance will apply to.")
    //         .addChoices({ name: "Aurora", value: "aurora" }, { name: "Nova", value: "nova" })
    //         .setRequired(true)
    //     )
    //     .addStringOption(option => option.setName("name")
    //         .setDescription("Enter a name for this new alliance.")
    //         .setRequired(true)
    //     )
    // )
    // .addSubcommand(subCmd => subCmd.setName('edit').setDescription('Edit an existing alliance.')
    //     .addStringOption(option => option.setName("map")
    //         .setDescription("Choose a map the edits will apply to.")
    //         .addChoices({ name: "Aurora", value: "aurora" }, { name: "Nova", value: "nova" })
    //         .setRequired(true)
    //     )
    //     .addStringOption(option => option.setName("name")
    //         .setDescription("Enter name of the alliance to edit.")
    //         .setRequired(true)
    //     )
    // )

// Filter by whether both fullName/label or short name include focusedValue.
const filterAlliances = (arr: DBAlliance[], key: string) => arr.filter(a => {
    const keyLower = key.toLowerCase()
    if (a.fullName) {
        if (a.fullName.toLowerCase().includes(keyLower)) return true
    }
    if (a.allianceName) {
        if (a.allianceName.toLowerCase().includes(keyLower)) return true
    }

    return false
})

const CHOICE_LIMIT = 25

const allianceCmd: SlashCommand<typeof cmdData> = {
    name: "alliance",
    description: desc,
    data: cmdData,
    autocomplete: async (_, interaction) => {
        const focusedValue = interaction.options.getFocused()
        let alliances = await database.AuroraDB.getAlliances()

        // Not a blank string, we typed something.
        if (!focusedValue || focusedValue.trim().length > 0) {
            alliances = filterAlliances(alliances, focusedValue)
        }

        // Make sure we only have X amt of choices (discord limit).
        if (alliances.length > CHOICE_LIMIT) {
            alliances = alliances.slice(0, CHOICE_LIMIT)
        }

        // Sort by lowest (best) rank and exclude any with a broken/missing `rank` key.
        alliances = alliances.filter(a => a.rank).sort((a1, a2) => a1.rank - a2.rank)

        const choices = alliances.map(a => {
            const name = a.fullName ? `${a.allianceName} | ${a.fullName}` : a.allianceName
            return { 
                name: name + ` | #${a.rank}`, 
                value: a.allianceName // What we send to the actual cmd (run function).
            }
        })

        await interaction.respond(choices)
    },
    run: async (client, interaction) => {
        const cmd = interaction.options.getSubcommand().toLowerCase()

        switch(cmd) {
            case "lookup": {
                await interaction.deferReply()

                const name = interaction.options.getString("name")

                //#region TODO: Replace with `AllianceLookup` class and call init(). 
                const { foundAlliance } = await database.AuroraDB.getAlliance(name)
                if (!foundAlliance) return interaction.editReply({embeds: [errorEmbed(interaction)
                    .setTitle("Error fetching alliance")
                    .setDescription("That alliance does not exist! Please try again.")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

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
                
                        if (p.town?.name) {
                            return p.nation?.name
                                ? `${name} of ${p.town.name} (**${p.nation.name}**)`
                                : `${name} of ${p.town.name}`
                        }
                        
                        return name
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
                
                const allianceEmbed = new CustomEmbed(client, `Alliance Info | ${getNameOrLabel(foundAlliance)}${rank}`)
                    .addField("Leader(s)", leadersStr, false)
                    .addField("Type", backtick(allianceType), true)
                    .addField("Size", backtick(Math.round(foundAlliance.area), { postfix: " Chunks" }), true)
                    .addField("Towns", backtick(foundAlliance.towns), true)
                    .addField("Residents", backtick(foundAlliance.residents), true)
                    .setColor(colour)
                    .setThumbnail(foundAlliance.imageURL ? foundAlliance.imageURL : 'attachment://aurora.png')
                    .setBasicAuthorInfo(interaction.user)
                    .setTimestamp()

                if (foundAlliance.online) {
                    allianceEmbed.addField("Online", backtick(foundAlliance.online.length), true)
                }

                if (foundAlliance.lastUpdated) {
                    const formattedTs = timestampDateTime(foundAlliance.lastUpdated)
                    allianceEmbed.addField("Last Updated", formattedTs)
                }

                if (foundAlliance.discordInvite != "No discord invite has been set for this alliance") {
                    allianceEmbed.setURL(foundAlliance.discordInvite)
                }
                
                const nationsString = foundAlliance.nations.join(", ")
                const allianceNationsLen = foundAlliance.nations.length

                if (nationsString.length < 1024) {
                    if (allianceNationsLen < 1) {
                        allianceEmbed.addField("Nations [0]", "There are no nations in this alliance.")
                    }
                    else allianceEmbed.addField(`Nations [${allianceNationsLen}]`, backticks(nationsString))
                }
                else {
                    allianceEmbed.addField(
                        `Nations [${allianceNationsLen}]`, 
                        "Too many nations to display! Click the 'view all' button to see the full list."
                    )

                    allianceEmbed.addButton('view_all_nations', 'View All Nations', ButtonStyle.Primary)
                }

                const thumbnail = foundAlliance.imageURL ? [] : [AURORA.thumbnail]
                //#endregion

                return interaction.editReply({
                    embeds: [allianceEmbed],
                    files: thumbnail,
                    components: allianceEmbed.components
                })
            }
            // case "create": {
            //     await checkEditor(interaction) 
            //     const foundAlliance = await getAlliance(opts, false)

            //     // Make sure it doesn't exist already.
            //     if (foundAlliance) return interaction.reply({embeds: [new EmbedBuilder()
            //         .setColor(Colors.Red)
            //         .setTitle("Error creating alliance!")
            //         .setDescription("That alliance already exists.\nChoose another name or disband/rename the current one.")
            //         .setTimestamp()
            //     ]})
            
            //     const creationModal = new AllianceModal('alliance_create', 'Creating an alliance')
            //     return creationModal.main(opts).show(interaction)
            // }
            // case "edit": {
            //     await checkEditor(interaction)
            //     const foundAlliance = await getAlliance(opts, false) 

            //     // Make sure it exists already.
            //     if (!foundAlliance) return interaction.reply({embeds: [new EmbedBuilder()
            //         .setColor(Colors.Red)
            //         .setTitle("Error editing alliance!")
            //         .setDescription("That alliance does not exist.")
            //         .setTimestamp()
            //     ]})

            //     const editingModal = new AllianceModal('alliance_edit', 'Editing an alliance', foundAlliance)
            //     return editingModal.main(opts).show(interaction)
            // }
            // case "disband": {
            //     // Check dev perm.
                
            // }
        }
        
        // Grab and apply field values to current alliance.
        
        // Overwrite alliance at database index.

        // Handle success message

    }
}

export default allianceCmd