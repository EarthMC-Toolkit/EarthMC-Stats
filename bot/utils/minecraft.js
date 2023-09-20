const { request } = require('undici')

class Players {
    /**
     * @param { string } name 
     * @returns { string | number }
     */
    static async nameToUUID(name) {
        const player = await request(`https://api.mojang.com/users/profiles/minecraft/${name}`).then(res => res.body.json())
        if (!player) return null

        return player.id
    }

    /**
     * @param { string | number } input 
     * @returns { unknown }
     */
    static async get(input) {
        let uuid = await this.nameToUUID(input) // Test if input is a name
        if (!uuid) uuid = input // If not, maybe it's already a UUID?

        const profile = await request(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`).then(res => res.body.json())
        if (!profile) return null // Neither name or UUID, must not exist.

        return profile
    }
}

module.exports = {
    Players
}