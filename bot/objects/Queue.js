const { request } = require("undici")
    
function format(map) {
    const max = map.config?.maxcount,
          diff = max - map.count

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
})

const jsonReq = (url) => request(url).then(res => res.body.json()).catch(() => {})

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
        this.nova.config = await jsonReq("https://earthmc.net/map/nova/standalone/MySQL_configuration.php")
        this.aurora.config = await jsonReq("https://earthmc.net/map/aurora/standalone/MySQL_configuration.php")
    }

    #formatMaps() {
        this.nova.formatted = format(this.nova)
        this.aurora.formatted = format(this.aurora)
    }

    #setServerInfo(server) {
        this.serverOnline = !!server
        this.totalPlayers = server?.players?.online
    }

    #setMapInfo(arr) {
        const maps = [this.aurora, this.nova]
        arr.forEach((map, i) => {
            maps[i].online = !!map
            maps[i].count = map?.currentcount ?? 0
        })
    }
}

module.exports = Queue