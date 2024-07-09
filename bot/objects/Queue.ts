import type { SquaremapPlayersResponse } from 'earthmc'

interface Map {
    online: boolean
    max: number
    count: number
    formatted: string
}

function format(map: Map) {
    const diff = map.max - map.count
    const freeSpots = diff > 0 ? diff : 0

    const count = `${ 
        map.online ? `${freeSpots < 1 ? `**FULL** ${map.count}` : map.count}/${map.max}`
        : ":red_circle: **OFFLINE**" 
    }`
                   
    const spots = ` (${freeSpots} free spot${freeSpots == 1 ? "" : "s"})`
    return count.concat(spots)
}

const initMap = () => ({
    online: true,
    count: 0,
    max: 400,
    config: null,
    formatted: ""
}) as Map

class Queue {
    serverOnline = true
    totalPlayers = 0

    aurora = initMap()
    //nova   = initMap()

    constructor(server, aurora: SquaremapPlayersResponse) {
        this.#setServerInfo(server)
        this.#setAuroraInfo(aurora)
    }
    
    get = () => {
        const q = this.totalPlayers - this.aurora.count
        return (q < 0 ? 0 : q).toString()
    }
    
    async init() {
        this.aurora.max
        this.#formatMaps()
    }

    #formatMaps() {
        //this.nova.formatted = format(this.nova)
        this.aurora.formatted = format(this.aurora)
    }

    #setServerInfo(server) {
        this.serverOnline = !!server
        this.totalPlayers = server?.players?.online
    }

    #setAuroraInfo(res: SquaremapPlayersResponse) {
        this.aurora.online = !!res
        this.aurora.count = res?.players.length ?? 0
        this.aurora.max = res.max
    }
}

export default Queue