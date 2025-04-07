//#region Imports
import * as fn from "../utils/fn.js"
import { initUpdates } from "../updater.js"

import { 
    getProduction
} from "../constants.js"

import { 
    ActivityType,
    type Client,
    type SlashCommandBuilder,
    type ApplicationCommandDataResolvable
} from "discord.js"

import type { 
    BaseCommand, SlashCommand,
    Button, DJSEvent,
    ExtendedClient
} from "../types.js"
//#endregion

let lastActivity = -1

const rdyEvent: DJSEvent = {
    name: 'ready',
    once: true,
    async execute(client: Client) {
        console.log(`${fn.time()} | ${client.user.username} is up!`)
        client.user.setPresence({ activities: [{ name: 'Startup Complete!' }], status: 'online' })

        await registerCommands(client)
        await registerButtons(client)
        //await registerModals()

        const watchingActivities = [
            `${client.guilds.cache.size} Servers`, 'towns being created.',
            'emctoolkit.vercel.app', 'for map updates', 'for /help', 
            'nations die', 'Wales boat sink', 'towns fall', 'players travel',
            'admin abuse', 'alliances form', 'the queue grow',
            'Fix sleep', 'townless players struggle'
        ]
    
        setInterval(() => {
            const randomNum = fn.random(watchingActivities, lastActivity)
            client.user.setActivity(watchingActivities[randomNum], { 
                type: ActivityType.Watching 
            })
    
            lastActivity = randomNum
        }, 90 * 1000)

        await initUpdates()
    }
}

const CMDS_PATH = `components/commands`
const SLASH_CMDS_PATH = `components/slashcommands`
const BUTTONS_PATH = `components/buttons`
//const MODALS_PATH = `components/modals`

async function registerCommands(client: ExtendedClient) {
    const auroraCmds = fn.readTsFiles(CMDS_PATH)

    for (const file of auroraCmds) {
        const commandFile = await import(`../../${CMDS_PATH}/${file}`)
        const cmd = commandFile.default as BaseCommand

        if (cmd.disabled) continue
        client.auroraCommands.set(cmd.name, cmd)
    }
    
    const slashCmds = fn.readTsFiles(SLASH_CMDS_PATH)
    const data: ApplicationCommandDataResolvable[] = []

    for (const file of slashCmds) {
        const commandFile = await import(`../../${SLASH_CMDS_PATH}/${file}`)
        const slashCmd = commandFile.default as SlashCommand<SlashCommandBuilder>

        if (slashCmd.disabled) continue
        client.slashCommands.set(slashCmd.name, slashCmd)

        if (slashCmd.data) {
            try {
                const json = slashCmd.data.toJSON()
                if (json) data.push(json)
            } catch (e) {
                console.error(`Error registering slash cmd: ${slashCmd.name}\n${e}`)
            }

            continue
        }
        
        data.push({
            name: slashCmd.name,
            description: slashCmd.description
        })
    }

    if (getProduction()) await client.application.commands.set(data)
    //else await client.guilds.cache.get(process.env.DEBUG_GUILD)?.commands.set(data)

    console.log(`Commands registered.
        \nRegular: ${auroraCmds.length}
        \nSlash: ${slashCmds.length}`
    )
}

async function registerButtons(client: ExtendedClient) {
    const buttons = fn.readTsFiles(BUTTONS_PATH) // Reads cwd. In our case it will read all files in ~./aurora/buttons/

    for (const file of buttons) {
        const buttonFile = await import(`../../${BUTTONS_PATH}/${file}`)
        const button: Button = buttonFile.default

        if (!button) {
            console.log(`Could not register button: ${file}. Default export not found.`)
            continue
        }

        if (button.id) {
            console.log("Registering button: " + button.id)
            client.buttons.set(button.id, button)
        }
    }
}

// async function registerModals() {

// }

export default rdyEvent