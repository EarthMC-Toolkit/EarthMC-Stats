//#region Imports
import dotenv from 'dotenv'
dotenv.config()

import * as fn from "../utils/fn.js"
import { initUpdates } from "../updater.js"

import { 
    prod
    // queueSubbedChannels,
    // townlessSubbedChannels 
} from "../constants.js"

import { 
    ActivityType,
    ContextMenuCommandBuilder,
    Collection,
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

        registerCommands(client)
        registerButtons(client)
        //registerModals()

        const watchingActivities = [
            `${client.guilds.cache.size} Servers`, 'towns being created.',
            'emctoolkit.vercel.app', 'for map updates', 'for /help', 
            'nations die', 'Wales boat sink', 'towns fall', 'players travel',
            'admin abuse', 'alliances form', 'the queue grow',
            'Fix sleep', 'townless players struggle'
        ]
    
        await initUpdates(prod)

        // TODO: Re-enable if live stuff comes back.
        // if (prod) {
        //     queueSubbedChannels.get().then(doc => { 
        //         const { channelIDs } = doc.data()
        //         fn.setQueueSubbedChannels(channelIDs)
    
        //         console.log(`${fn.time()} | Queue subbed channels retrieved. Length: ${channelIDs.length}`)
        //     })
    
        //     townlessSubbedChannels.get().then(doc => { 
        //         const { channelIDs } = doc.data()
        //         fn.setTownlessSubbedChannels(channelIDs)
    
        //         console.log(`${fn.time()} | Townless subbed channels retrieved. Length: ${channelIDs.length}`)
        //     })
        // }
    
        setInterval(() => {
            const randomNum = fn.random(watchingActivities, lastActivity)
            client.user.setActivity(watchingActivities[randomNum], { 
                type: ActivityType.Watching 
            })
    
            lastActivity = randomNum
        }, 30*1000)
    }
}

async function registerCommands(client: ExtendedClient) {
    const auroraCmds = fn.readTsFiles(`aurora/commands`)
    //const novaCmds = fn.readTsFiles(`nova/commands`)

    for (const file of auroraCmds) {
        const commandFile = await import(`../../aurora/commands/${file}`)
        const cmd = commandFile.default as BaseCommand

        if (cmd.disabled) continue
        client.auroraCommands.set(cmd.name, cmd)
    }

    // for (const file of novaCmds) {
    //     const commandFile = await import(`../../nova/commands/${file}`)
    //     const command = commandFile.default

    //     if (!command.disabled) 
    //         client['novaCommands'].set(command.name, command)
    // }

    const slashCmds = fn.readTsFiles(`aurora/slashcommands`)
    const data: ApplicationCommandDataResolvable[] = []

    for (const file of slashCmds) {
        const commandFile = await import(`../../aurora/slashcommands/${file}`)
        const slashCmd = commandFile.default as SlashCommand<SlashCommandBuilder>

        if (slashCmd.disabled) continue
        client.slashCommands.set(slashCmd.name, slashCmd)

        if (slashCmd.data) {
            data.push(slashCmd.data.toJSON())
            continue
        }
        
        data.push({
            name: slashCmd.name,
            description: slashCmd.description
        })
    }

    data.push(new ContextMenuCommandBuilder()
        .setName("Link User")
        .setType(2) // ApplicationCommandType.User
    )

    if (prod) await client.application.commands.set(data)
    //else await client.guilds.cache.get(process.env.DEBUG_GUILD)?.commands.set(data)

    console.log(`Commands registered.
        \nRegular: ${auroraCmds.length}
        \nSlash: ${slashCmds.length}`
    )
}

async function registerButtons(client: ExtendedClient) {
    client.buttons = new Collection()

    const buttonsPath = `aurora/buttons`
    const buttons = fn.readTsFiles(buttonsPath)

    for (const file of buttons) {
        const buttonFile = await import(`../../${buttonsPath}/${file}`)
        const button = buttonFile.default as Button

        if (button.id) {
            (client['buttons'] as Collection<string, Button>).set(button.id, button)
        }
    }
}

// async function registerModals() {

// }

export default rdyEvent