import { 
    type SquaremapPlayer,
    Aurora, OfficialAPI
} from "earthmc"

import {
    Colors, ButtonStyle,
    EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import type {
    ChatInputCommandInteraction,
    Client
} from "discord.js"

import { 
    database, AURORA,
    backtick, backticks,
    timestampDateTime,
    paginatorInteraction
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

const successEmbed = (interaction: ChatInputCommandInteraction) => new EmbedBuilder()
    .setColor(Colors.DarkBlue)
    .setTimestamp()
    .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
    })

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
            .setDescription("The colloquial/short name of the alliance.")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subCmd => subCmd.setName("online")
        .setDescription("Displays a list of all online players in the specified alliance. Includes info about them.")
        .addStringOption(opt => opt.setName("name")
            .setDescription("The colloquial/short name of the alliance.")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subCmd => subCmd.setName("score")
        .setDescription("Outputs the specified alliance's score calculated using EMCS tailored weights.")
        .addStringOption(opt => opt.setName("name")
            .setDescription("The colloquial/short name of the alliance.")
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

const CHOICE_LIMIT = 25
const SCORE_WEIGHTS = {
    nations: 0.35,
    towns: 0.3,
    residents: 0.2,
    area: 0.15
    //wealth: 0.1
}

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

export async function allianceLookup(name: string, client: Client, interaction: ChatInputCommandInteraction) {
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
    
    const allianceNationsLen = foundAlliance.nations.length
    const nationsString = foundAlliance.nations
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .join(", ")

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

export async function allianceOnline(name: string, client: Client, interaction: ChatInputCommandInteraction) {
    // TODO: Do this in getAlliance() so we dont req ops twice. 
    const ops: SquaremapPlayer[] = await Aurora.Players.online(true).catch(() => null)
    if (!ops) return interaction.editReply({embeds: [errorEmbed(interaction)
        .setTitle(`Error fetching online players`)
    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

    const { foundAlliance } = await database.AuroraDB.getAlliance(name)
    if (!foundAlliance) return interaction.editReply({embeds: [errorEmbed(interaction)
        .setTitle("Error fetching alliance")
        .setDescription("That alliance does not exist! Please try again.")
    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

    const allianceName = getNameOrLabel(foundAlliance)
    
    const allianceOps = ops.filter(op => foundAlliance.online.some(p => p == op.name)) ?? []
    if (allianceOps.length < 1) return interaction.editReply({embeds: [successEmbed(interaction)
        .setTitle(`Online in ${allianceName} [0]`)
        .setDescription("No players are online in this alliance :(")
    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

    const embeds: EmbedBuilder[] = []
    const allData = allianceOps
        .map(res => `${res.name} - ${res.town} | ${res.rank}`)
        .join('\n').match(/(?:^.*$\n?){1,10}/mg)

    const len = allData.length
    for (let i = 0; i < len; i++) {
        embeds[i] = successEmbed(interaction)
            .setTitle(`Online in ${allianceName} [${allianceOps.length}]`)
            .setDescription("```" + allData[i] + "```")
            .setFooter({ 
                text: `Page ${i+1}/${allData.length}`, 
                iconURL: client.user.avatarURL() 
            })
    }

    return await interaction.editReply({ embeds: [embeds[0]] })
        .then(() => paginatorInteraction(interaction, embeds, 0))
}

async function allianceScore(name: string, interaction: ChatInputCommandInteraction) {
    const { foundAlliance } = await database.AuroraDB.getAlliance(name)
    if (!foundAlliance) return interaction.editReply({embeds: [errorEmbed(interaction)
        .setTitle("Error fetching alliance")
        .setDescription("That alliance does not exist! Please try again.")
    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

    const scores = {
        nations: foundAlliance.nations.length * SCORE_WEIGHTS.nations,
        towns: foundAlliance.towns * SCORE_WEIGHTS.towns,
        residents: foundAlliance.residents * SCORE_WEIGHTS.residents,
        area: foundAlliance.area * SCORE_WEIGHTS.area
        //economy: (foundAlliance.economy / 10000) * weights.economy, // Economy scaled down for readability
    }
    
    const nationsCalcStr = `**Nations**: ${foundAlliance.nations.length} * 35% = ${scores.nations.toFixed(1)}`
    const townsCalcStr = `**Towns**: ${foundAlliance.towns} * 30% = ${scores.towns.toFixed(1)}`
    const residentsCalcStr = `**Residents**: ${foundAlliance.residents} * 20% = ${scores.residents.toFixed(1)}`
    const areaCalcStr = `**Area**: ${foundAlliance.area} * 15% = ${scores.area.toFixed(1)}`
    //const wealthCalcStr = `${foundAlliance.wealth} × 10% = ${scores.economy.toFixed(1)}`

    const totalScore = Math.round(scores.nations + scores.towns + scores.residents + scores.area)

    const embed = new EmbedBuilder()
        .setTitle(`EMCS Score | ${getNameOrLabel(foundAlliance)}`)
        .setThumbnail(foundAlliance.imageURL ? foundAlliance.imageURL : 'attachment://aurora.png')
        .setColor(foundAlliance.colours 
            ? parseInt(foundAlliance.colours?.fill.replace('#', '0x')) 
            : Colors.DarkBlue
        )
        .setDescription(`
            ${nationsCalcStr}
            ${townsCalcStr}
            ${residentsCalcStr}
            ${areaCalcStr}\n
            **Total**: ${backtick(totalScore.toLocaleString())}
        `)

    return await interaction.editReply({ 
        embeds: [embed],
        files: foundAlliance.imageURL ? [] : [AURORA.thumbnail]
    })
}

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

                return await allianceLookup(name, client, interaction)
            }
            case "online": {
                await interaction.deferReply()
                const name = interaction.options.getString("name")

                return await allianceOnline(name, client, interaction)
            }
            case "score": {
                await interaction.deferReply()
                const name = interaction.options.getString("name")

                return await allianceScore(name, interaction)
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