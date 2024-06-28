import * as fn from '../utils/fn.js'
    
type Map = {
    online: boolean,
    count: number,
    config: any,
    formatted: string
}

function format(map: Map) {
    const max = map.config?.maxcount
    const diff = max - map.count

    const freeSpots = diff > 0 ? diff : 0

    const count = `${ 
        map.online ? `${freeSpots < 1 ? `**FULL** ${map.count}` : map.count}/${max}`
        : ":red_circle: **OFFLINE**" 
    }`
                   
    const spots = ` (${freeSpots} free spot${freeSpots == 1 ? "" : "s"})`
    return count.concat(spots)
}

const initMap = () => ({
    online: true,
    count: 0,
    config: null,
    formatted: ""
}) as Map

class Queue {
    serverOnline = true
    totalPlayers = 0

    aurora = initMap()
    nova   = initMap()

    constructor(server, aurora, nova) {
        this.#setServerInfo(server)
        this.#setMapInfo([aurora, nova])
    }
    
    get = () => {
        const q = this.totalPlayers - (this.aurora.count - this.nova.count)
        return (q < 0 ? 0 : q).toString()
    }
    
    async init() {
        await this.#fetchConfigs()
        this.#formatMaps()
    }

    async #fetchConfigs() {
        this.nova.config = await fn.jsonReq("https://earthmc.net/map/nova/standalone/MySQL_configuration.php")
        this.aurora.config = await fn.jsonReq("https://map.earthmc.net/tiles/players.json")
    }

    #formatMaps() {
        this.nova.formatted = format(this.nova)
        this.aurora.formatted = format(this.aurora)
    }

    #setServerInfo(server) {
        this.serverOnline = !!server
        this.totalPlayers = server?.players?.online
    }

    #setMapInfo(arr: any[]) {
        const maps = [this.aurora, this.nova]
        arr.forEach((map, i) => {
            maps[i].online = !!map
            maps[i].count = map?.currentcount ?? 0
        })
    }
}

export default Queue