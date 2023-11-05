//#region Imports
import dotenv from 'dotenv'
dotenv.config()

import * as fn from "../utils/fn.js"
import { initUpdates } from "../updater.js"

import { 
    prod, 
    queueSubbedChannels,
    townlessSubbedChannels 
} from "../constants.js"

import { 
    Client, 
    Collection,
    ActivityType,
    ContextMenuCommandBuilder,
} from "discord.js"

import { DJSEvent } from "../types.js"
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
            'emctoolkit.vercel.app', 'for Dynmap updates', 'for /help', 
            'nations die', 'Wales boat sink', 'towns fall', 'players travel',
            'admins sleep', 'alliances forming', 'the queue grow'
        ]
    
        if (prod) {
            console.log("Production enabled, initializing data updates..")
            await initUpdates()
    
            queueSubbedChannels.get().then(doc => { 
                const { channelIDs } = doc.data()
                fn.setQueueSubbedChannels(channelIDs)
    
                console.log(`${fn.time()} | Queue subbed channels retrieved. Length: ${channelIDs.length}`)
            })
    
            townlessSubbedChannels.get().then(doc => { 
                const { channelIDs } = doc.data()
                fn.setTownlessSubbedChannels(channelIDs)
    
                console.log(`${fn.time()} | Townless subbed channels retrieved. Length: ${channelIDs.length}`)
            })
        }
    
        setInterval(() => {
            const randomNum = fn.random(watchingActivities, lastActivity)
            client.user.setActivity(watchingActivities[randomNum], { 
                type: ActivityType.Watching 
            })
    
            lastActivity = randomNum
        }, 30*1000)
    }
}

async function registerCommands(client: Client) {
    const dir = process.cwd()

    const slashCommands = fn.readTsFiles(`${dir}/aurora/slashcommands`)
    const auroraCmds = fn.readTsFiles(`${dir}/aurora/commands`)
    const novaCmds = fn.readTsFiles(`${dir}/nova/commands`)

    const data = []

    for (const file of auroraCmds) {
        const commandFile = await import(`${dir}/aurora/commands/${file}`)
        const command = commandFile.default

        if (!command.disabled) 
            client['auroraCommands'].set(command.name, command)
    }

    for (const file of novaCmds) {
        const commandFile = await import(`${dir}/nova/commands/${file}`)
        const command = commandFile.default

        if (!command.disabled) 
            client['novaCommands'].set(command.name, command)
    }

    for (const file of slashCommands) {
        const commandFile = await import(`${dir}/aurora/slashcommands/${file}`)
        const command = commandFile.default

        if (command.disabled) continue
    
        client['slashCommands'].set(command.name, command)

        if (command.data) data.push(command.data.toJSON())
        else {
            data.push({
                name: command.name,
                description: command.description
            })
        }
    }

    const linkAction = new ContextMenuCommandBuilder().setName("Link User").setType(2) 
    data.push(linkAction)

    const prod = process.env.PROD == "true"
    if (prod) await client.application.commands.set(data)
    else await client.guilds.cache.get(process.env.DEBUG_GUILD)?.commands.set(data)

    console.log(`Commands registered.
        \nRegular: ${auroraCmds.length + novaCmds.length}
        \nSlash: ${slashCommands.length}`
    )
}

async function registerButtons(client: Client) {
    client['buttons'] = new Collection()

    const buttonsPath = `${process.cwd() + "/aurora/buttons"}`
    const buttons = fn.readTsFiles(buttonsPath)

    for (const file of buttons) {
        const buttonFile = await import(`${buttonsPath}/${file}`)
        const button = buttonFile.default

        if (button.id) {
            client['buttons'].set(button.id)
        }
    }
}

// async function registerModals() {

// }

export default rdyEvent