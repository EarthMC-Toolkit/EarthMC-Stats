//#region Imports
import { 
    ActivityType,
    type Client,
    type SlashCommandBuilder,
    type ApplicationCommandDataResolvable
} from "discord.js"

import { getProduction } from "../constants.js"
import { initUpdates } from "../updater.js"

import {
    randomFrom,
    readTsFiles
} from "../utils/index.js"

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
        console.log(`${client.user.username} is up!`)
        client.user.setPresence({ activities: [{ name: 'Startup Complete!' }], status: 'online' })

        //#region Regular, non-slash commands
        await registerCommands(client)
        //#endregion

        //#region Slash Commands
        await registerSlashCommands(client)
        await registerDevCommands(client)
        //#endregion

        //#region Other commands/interactions
        await registerButtons(client)
        //await registerModals()
        //#endregion

        //#region Schedule status/activity updates
        const watchingActivities = [
            `${client.guilds.cache.size} Servers`, 'towns being created.',
            'emctoolkit.vercel.app', 'for map updates', 'for /help', 
            'nations die', 'Wales boat sink', 'towns fall', 'players travel',
            'admin abuse', 'alliances form', 'Fix sleep', 'townless players struggle'
        ]
    
        setInterval(() => {
            const randomNum = randomFrom(watchingActivities, lastActivity)
            client.user.setActivity(watchingActivities[randomNum], { 
                type: ActivityType.Watching 
            })
    
            lastActivity = randomNum
        }, 90 * 1000)
        //#endregion

        await initUpdates()
    }
}

// TODO: Replace with path.resolve and use process.cwd()
const CMDS_PATH = `../../components/commands`
const SLASH_CMDS_PATH = `../../components/slashcommands`
const SLASH_CMDS_DEV_PATH = `../../components/slashcommands/dev`
const BUTTONS_PATH = `../../components/buttons`
//const MODALS_PATH = `../../components/modals`

async function importDefault<T>(path: string): Promise<T> {
    const module = await import(path)
    return module.default
}

async function registerCommands(client: ExtendedClient) {
    const cmds = readTsFiles(CMDS_PATH)

    for (const file of cmds) {
        const cmd: BaseCommand = await importDefault(`${CMDS_PATH}/${file}`)

        if (cmd.disabled) continue
        client.commands.set(cmd.name, cmd)
    }

    console.log(`Registered ${client.commands.size} regular commands.`)
}

async function registerSlashCommands(client: ExtendedClient) {
    const slashCmds = readTsFiles(SLASH_CMDS_PATH)
    const data: ApplicationCommandDataResolvable[] = []

    for (const file of slashCmds) {
        const slashCmd: SlashCommand<SlashCommandBuilder> = await importDefault(`${SLASH_CMDS_PATH}/${file}`)

        if (slashCmd.disabled) continue
        client.commands.set(slashCmd.name, slashCmd)

        if (!slashCmd.data) {
            console.warn(`Cannot register slash cmd '${slashCmd.name}' without a valid \`data\` property.`)
            continue
        }

        try {
            const json = slashCmd.data.toJSON()
            if (json) data.push(json)
        } catch (e) {
            console.error(`Error registering slash cmd: ${slashCmd.name}\n${e}`)
        }
        
        // data.push({
        //     name: slashCmd.name,
        //     description: slashCmd.description
        // })
    }

    const cmdManager = getProduction() ? client.application.commands : client.guilds.cache.get(process.env.DEBUG_GUILD)?.commands
    if (cmdManager) await cmdManager.set(data)

    console.log(`Registered ${data.length} slash commands.`)
}

async function registerDevCommands(client: ExtendedClient) {
    const devSlashCmds = readTsFiles(SLASH_CMDS_DEV_PATH)
    const data: ApplicationCommandDataResolvable[] = []

    for (const file of devSlashCmds) {
        const slashCmd: SlashCommand<SlashCommandBuilder> = await importDefault(`${SLASH_CMDS_DEV_PATH}/${file}`)

        if (slashCmd.disabled) continue
        client.slashCommands.set(slashCmd.name, slashCmd)

        if (!slashCmd.data) {
            console.warn(`Cannot register dev slash cmd '${slashCmd.name}' without a valid \`data\` property.`)
            continue
        }

        try {
            const json = slashCmd.data.toJSON()
            if (json) data.push(json)
        } catch (e) {
            console.error(`Error registering dev slash cmd: ${slashCmd.name}\n${e}`)
        }

        // data.push({
        //     name: slashCmd.name,
        //     description: slashCmd.description
        // })
    }

    const devGuild = client.guilds.cache.get(process.env.DEBUG_GUILD)
    if (devGuild) await devGuild.commands.set(data)

    console.log(`Registered ${data.length} dev slash commands in debug guild.`)
}

async function registerButtons(client: ExtendedClient) {
    const buttons = readTsFiles(BUTTONS_PATH)

    for (const file of buttons) {
        const button: Button = await importDefault(`${BUTTONS_PATH}/${file}`)

        if (!button) {
            console.warn(`Could not register button: ${file}. Default export not found.`)
            continue
        }

        if (!button.id) {
            console.warn(`Button from file '${file}' cannot be registered without a valid id.`)
            continue
        }

        if (button.disabled) continue
        client.buttons.set(button.id, button)
    }

    console.log(`Registered ${client.buttons.size} buttons.`)
}

// async function registerModals() {

// }

export default rdyEvent