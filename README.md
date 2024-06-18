<div align="middle">
<img width="150" height="150" src="./icon.png">

# EarthMC Stats 
[![Discord](https://img.shields.io/discord/966271635894190090?style=flat-square&label=Join%20development%20discord&color=%235347f5)](https://discord.com/invite/AVtgkcRgFs)
[![Static Badge](https://img.shields.io/badge/1.6k_guilds-%23128237?style=flat-square&label=Invite%20the%20bot)](https://emctoolkit.vercel.app/invite)

The most popular Discord bot for **EarthMC** is now open source!

**EarthMC Stats** provides useful commands and info relating to players, towns, nations, alliances and more.<br>
This bot relies heavily on the purpose-made [NPM Library](https://www.npmjs.com/package/earthmc) which handles the parsing and caching of **Dynmap** data automatically.
</div>

## Notes
- Duplicated code is slowly being phased out in favour of helper classes found in the `common` folder.
- To reduce reads/writes, an in-memory cache is used alongside [Firestore](https://firebase.google.com/docs/firestore) - please don't mess with this.
- This repo is meant for viewing and attribution, hosting it yourself will **NOT** work.

## Features
✅ Written in **TypeScript** for type-safety and intellisense.<br>
✅ Uses modern **ESM** format which provides a nicer syntax and better module compatibility.<br>
✅ **DiscordJS** commands and events have their own files for clarity and maintainability.<br>
✅ **Firestore** database is used, allowing EMCS to be used seamlessly when EarthMC goes down.<br>
✅ Fast responses via an in-memory cache and fast HTTP client thanks to [Undici](https://undici.nodejs.org/#/?id=undicirequesturl-options-promise).

## Disclaimer
This project has the [Attribution-NonCommercial-ShareAlike 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) license.

<img width="180" src="https://mirrors.creativecommons.org/presskit/buttons/88x31/png/by-nc-sa.png">

### You are free to:
**Share** - Copy and redistribute the material in any medium or format\
**Adapt** - Remix, transform, and build upon the material

### Under the following terms:
**Attribution**<br>
You must give appropriate credit, provide a link to the license, and indicate if changes were made.<br>
You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.<br>

**NonCommercial**<br>
You may not use the material for commercial purposes.<br>

**ShareAlike**<br>
If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.
