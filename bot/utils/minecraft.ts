import type { 
    MCSessionProfile, 
    MCUserProfile 
} from '../types.js'

import { jsonReq } from "./fn.js"

class Players {
    static async nameToUUID(name: string) {
        const player = await jsonReq(`https://api.mojang.com/users/profiles/minecraft/${name}`) as MCUserProfile
        return player?.id
    }

    static async get(input: string | number) {
        let uuid = await this.nameToUUID(input.toString()) // Test if input is a name
        if (!uuid) uuid = input // If not, maybe it's already a UUID?

        const profile = await jsonReq(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`) as MCSessionProfile
        return profile?.id ? profile : null // No UUID, must not exist.
    }
}

export {
    Players
}