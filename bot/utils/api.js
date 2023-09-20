const News = require("../objects/News"),
      database = require("./database"),
      fn = require("./fn"),
      { request } = require("undici")

// const getDBPlayers = async () => database.getPlayers().then(players => {
//     if (!players) return null

//     return players.map(p => {
//         let id = p.linkedID

//         if (id && id != '')
//             p.discord = id

//         delete p.linkedID
//         return p
//     })
// })//.catch(console.log)

const reqHeaders = {
    'Content-Type': 'application/json',
    'authorization': process.env.API_AUTH_KEY
}

const sendRequest = async (route, method, content) => request(`https://emctoolkit.vercel.app/api/${route}`, {
    method: method,
    mode: 'cors',
    body: JSON.stringify(content),
    headers: reqHeaders
}).catch(e => console.log(e))

const replaceWithUnix = (arr, map) => arr.filter(p => !!p.lastOnline && p.lastOnline[map])
    .map(p => ({ ...p, lastOnline: fn.unixFromDate(p.lastOnline[map]) }))

const sendNews = async (client, map) => {
    const channel = await client.channels.fetch(map == 'nova' ? fn.NOVA.newsChannel : fn.AURORA.newsChannel),
          msgArr = await channel.messages.fetch()
            .then(msgs => msgs.filter(m => m.content != "[Original Message Deleted]" && !m.content.startsWith("/")))
            .catch(console.error)

    sendNewsReq(msgArr, map)
}

async function sendNewsReq(msgs, mapName) {
    const route = `${mapName}/news`,
          newsArr = msgs.map(m => new News(m))

    const newsObj = { 
        all: newsArr, 
        latest: new News(msgs.first())
    }

    await sendRequest(route, 'POST', newsObj)
    console.log('Sent POST request to ' + route)
}

// async function sendPlayers() {
//     let players = await getDBPlayers().catch(e => console.log(e))
//     if (!players) return

//     let nova = replaceWithUnix(players, 'nova'),
//         aurora = replaceWithUnix(players, 'aurora')

//     await sendRequest('aurora/allplayers', 'PUT', aurora)
//     await sendRequest('nova/allplayers', 'PUT', nova)
    
//     console.log('Sent PUT requests to allplayers')
// }

async function sendAlliances() {
    const novaAlliances = await database.Nova.getAlliances(),
          auroraAlliances = await database.Aurora.getAlliances()
 
    if (auroraAlliances) await sendRequest('aurora/alliances', 'PUT', auroraAlliances)
    if (novaAlliances) await sendRequest('nova/alliances', 'PUT', novaAlliances)

    console.log('Sent PUT requests to alliances')
}

const get = endpoint => request(`https://emctoolkit.vercel.app/api/${endpoint}`).then(res => res.body.json())
module.exports = {
    replaceWithUnix,
    sendNews, sendAlliances,
    get //, getDBPlayers
}