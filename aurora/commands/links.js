const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn')

module.exports = {
    name: "links",
    description: "Sends useful bot-related links",
    slashCommand: false,
    aliases: ["invite", "resources"],
    run: async (client, message) => {
        const general = new Discord.MessageEmbed()
            .setColor("BLUE")
            .setTitle("General")
            .setThumbnail(client.user.avatarURL())
            .addFields(
                fn.embedField("Invite the bot", "[Click Here](https://emctoolkit.vercel.app/invite)", true),
                fn.embedField("Website", "[Visit](https://emctoolkit.vercel.app)", true),
                fn.embedField("Development Discord", "[Join](https://discord.gg/AVtgkcRgFs)", true)
            )

        const toolkit = new Discord.MessageEmbed()
            .setColor("RED")
            .setTitle("Toolkit Resources")
            .setThumbnail("https://avatars.githubusercontent.com/u/99929501?s=400&u=7d6eeb131f448cdb960e09b155dcb190f8a2eb21&v=4")
            .addFields(
                fn.embedField(`EarthMC Essentials (Mod)`, `
                    [Visit Modrinth](https://modrinth.com/mod/emce)\n
                    [Visit Github](https://github.com/EarthMC-Toolkit/EarthMCEssentials/releases)
                `),
                fn.embedField("JS Library", `
                    [Visit Github](https://github.com/EarthMC-Toolkit/EarthMC-NPM)\n
                    [Visit NPM](https://npmjs.com/package/earthmc)
                `, true),
                fn.embedField("Python Library", `
                    [Visit Github](https://github.com/EarthMC-Toolkit/EarthMC-PY)\n
                    [Visit PyPI](https://pypi.org/project/EarthMC/)
                `, true),
                fn.embedField("Java Library", "[Visit Github](https://github.com/EarthMC-Toolkit/EarthMC-Wrapper)", true),
                fn.embedField("API", "[Visit Github](https://github.com/Owen3H/EarthMC-Toolkit-Website)")
            )

        return message.reply({ embeds: [general, toolkit] })
    }
}