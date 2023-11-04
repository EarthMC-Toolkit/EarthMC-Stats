import fs from "fs"
import dotenv from 'dotenv'
dotenv.config()

import { 
    Client, 
    Collection,
    ActivityType,
    ContextMenuCommandBuilder,
} from "discord.js"

import { Button, InteractionCommand, MessageCommand } from "../types.js"
import * as fn from "../utils/fn.js"

import * as updater from "../updater.js"
import { prod } from "../constants.js"

let lastActivity = -1

export default {
    name: 'ready',
    once: true,
    async execute(client: Client) {
        console.log(`${fn.time()} | ${client.user.username} is up!`)
        client.user.setPresence({ activities: [{ name: 'Startup Complete!' }], status: 'online' })

        registerCommands(client)
        registerButtons(client)

        const watchingActivities = [
            `${client.guilds.cache.size} Servers`, 'towns being created.',
            'emctoolkit.vercel.app', 'for Dynmap updates', 'for /help', 
            'nations die', 'Wales boat sink', 'towns fall', 'players travel',
            'admins sleep', 'alliances forming', 'the queue grow'
        ]
    
        if (prod) {
            console.log("Production enabled, initializing data updates..")
            await updater.init()
    
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
    const data = [],
          slashCommands = fs.readdirSync('./aurora/slashcommands').filter(file => file.endsWith('.ts')),
          auroraCmds = fs.readdirSync('./aurora/commands').filter(file => file.endsWith('.ts')),
          novaCmds = fs.readdirSync('./nova/commands').filter(file => file.endsWith('.ts'))

    for (const file of auroraCmds) {
        const commandFile = await import(`./aurora/commands/${file}`)
        const command = commandFile.default as MessageCommand

        if (!command.disabled) 
            client['auroraCommands'].set(command.name, command)
    }

    for (const file of novaCmds) {
        const commandFile = await import(`./nova/commands/${file}`)
        const command = commandFile.default as MessageCommand

        if (!command.disabled) 
            client['novaCommands'].set(command.name, command)
    }

    for (const file of slashCommands) {
        const commandFile = await import(`./aurora/slashcommands/${file}`)
        const command = commandFile.default as InteractionCommand

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

    console.log("Registered commands.")

    const linkAction = new ContextMenuCommandBuilder().setName("Link User").setType(2) 
    data.push(linkAction)

    const prod = process.env.PROD == "true"
    if (prod) await client.application.commands.set(data)
    else await client.guilds.cache.get(process.env.DEBUG_GUILD)?.commands.set(data)
}

async function registerButtons(client: Client) {
    client['buttons'] = new Collection()
    const buttons = fs.readdirSync('./aurora/buttons').filter(file => file.endsWith('.ts'))

    for (const file of buttons) {
        const buttonFile = await import(`./aurora/buttons/${file}`)
        const button = buttonFile.default as Button

        if (button.name) {
            client['buttons'].set(button.name)
        }
    }
}