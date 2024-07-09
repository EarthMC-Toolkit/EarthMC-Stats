import type { RawServerInfoV3, SquaremapPlayersResponse } from 'earthmc'

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

    constructor(server, aurora: { mapRes: SquaremapPlayersResponse, apiRes: RawServerInfoV3 }) {
        this.#setServerInfo(server)
        this.#setAuroraInfo(aurora.mapRes, aurora.apiRes)

        this.#formatMaps()
    }
    
    get = () => {
        const q = this.totalPlayers - this.aurora.count
        return (q < 0 ? 0 : q).toString()
    }

    #formatMaps() {
        //this.nova.formatted = format(this.nova)
        this.aurora.formatted = format(this.aurora)
    }

    #setServerInfo(server) {
        this.serverOnline = !!server
        this.totalPlayers = server?.players?.online
    }

    #setAuroraInfo(mapRes: SquaremapPlayersResponse, apiRes: RawServerInfoV3) {
        this.aurora.online = !!mapRes

        this.aurora.max = mapRes.max
        this.aurora.count = apiRes.stats.numOnlinePlayers
    }
}

export default Queue