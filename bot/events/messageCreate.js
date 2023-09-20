var Discord = require('discord.js'),
    { SEND_MESSAGES, EMBED_LINKS } = Discord.Permissions.FLAGS,
    fn = require('../utils/fn'),
    api = require('../utils/api')

async function runCmd(msg, sliceAmt, commands) {	
    const args = msg.content.slice(sliceAmt).split(/\s+/u)

    const commandName = args.shift().toLowerCase(),
          command = commands.get(commandName) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

    if (!command) return console.log(`Could not find command '${commandName}'`)
    
    if (msg.channel.type == "GUILD_TEXT") {
        const missingPermissions = [],
              requiredPermissions = [SEND_MESSAGES, EMBED_LINKS]

        for (let i = 0; i < requiredPermissions.length; i++)
            if (!msg.channel.memberPermissions(msg.guild.members.me).has(requiredPermissions[i]))
                missingPermissions.push(requiredPermissions[i].toString())
        
        if (missingPermissions.length > 0) return msg.author.send({embeds: [new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("DARK_GOLD")
            .setDescription(`**I don't have the required permissions in <#${msg.channel.id}>!**\n\n
                Missing permission${missingPermissions.length == 1 ? "" : "s"}: ${missingPermissions.join(", ")}`)
        ]})
    }
    
    await command.run(msg.client, msg, args).catch(console.log)
}

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.id == '970963659109060640') {
            const mapName = message.channel.id == fn.NOVA.newsChannel ? 
                 'nova' : message.channel.id == fn.AURORA.newsChannel ? 'aurora' : null
                
            if (mapName) return api.sendNews(message.client, mapName)
        }
    
        if (message.author.bot) return
    
        if (message.content.startsWith("/")) await runCmd(message, 1, message.client.auroraCommands)
        if (message.content.startsWith("a/")) await runCmd(message, 2, message.client.auroraCommands)
        if (message.content.startsWith("n/")) await runCmd(message, 2, message.client.novaCommands)
    }
}