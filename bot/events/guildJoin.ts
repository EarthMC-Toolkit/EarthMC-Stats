import { EmbedBuilder, type Guild } from "discord.js"

import { backtick } from "../utils/index.js"
import type { DJSEvent } from "../types.js"

const PURGE_THRESHOLD = 4

const leftEmbed = new EmbedBuilder()
    .setTitle("Notice of Departure")
    .setColor("#d64b00")

const guildCreate: DJSEvent = {
    name: "guildCreate",
    async execute(guild: Guild) {
        try {
            if (guild.memberCount > PURGE_THRESHOLD) return
    
            const members = await guild.members.list()
            const humanCount = members.filter(m => !m.user.bot).size
    
            // Enough humans in the server, no need to leave.
            if (humanCount > PURGE_THRESHOLD) return
    
            await guild.leave()
    
            const guildOwner = await guild.fetchOwner().catch(() => null)
            if (!guildOwner) return
    
            leftEmbed.setDescription(`
                Due to low member count, I have left this server: ${backtick(guild.name)}
                This was done for the following reasons:\n
                - To combat abuse, where the goal is to intentionally overwhelm the database.\n
                - To prevent hitting the 2500 server shard limit until truly necessary to avoid major refactoring and downtime.
                It is recommended you use the bot in more established servers like [EMC Toolkit Development](https://discord.gg/yyKkZfmFAK). Sorry for the inconvenience!
            `)

            await guildOwner.send({ embeds: [leftEmbed] }).catch(() => null)
        } catch (e) {
            console.error(`Error handling guild join for ${guild.name}.\n${e.message}`)
        }
    }
}

export default guildCreate