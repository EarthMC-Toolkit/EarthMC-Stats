import { request } from 'undici'

const jsonReq = (url: string) => request(url).then(res => res.body.json())

type MCUserProfile = {
    id: string | number
    name: string
}

type MCProfileProperty = {
    name: string
    value: string
}

type MCSessionProfile = MCUserProfile & {
    properties: MCProfileProperty[]
    profileActions: any[]
}

class Players {
    static async nameToUUID(name: string) {
        const player = await jsonReq(`https://api.mojang.com/users/profiles/minecraft/${name}`) as MCUserProfile
        if (!player) return null

        return player.id
    }

    static async get(input: string | number) {
        let uuid = await this.nameToUUID(input.toString()) // Test if input is a name
        if (!uuid) uuid = input // If not, maybe it's already a UUID?

        const profile = await jsonReq(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`) as MCSessionProfile
        if (!profile) return null // Neither name or UUID, must not exist.

        return profile
    }
}

export {
    Players
}