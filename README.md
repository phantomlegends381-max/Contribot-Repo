# Contribot-Repo
Slack Adding to WorkSpace Link: [https://slack.com/oauth/v2/authorize?client\_id=2210535565.11289162073267&scope=chat:write,commands,app\_mentions:read,channels:history&user\_scope=](https://slack.com/oauth/v2/authorize?client_id=2210535565.11289162073267&scope=chat:write,commands,app_mentions:read,channels:history&user_scope=)

Commands List:

/calcGoal : Required an github repository link to paste after typing the command. Shows user contribution based on commits

/beatifymaps: shows the coordinate in terms of latitude and longitude location, Country flag the city is in. required an city to paste after done typing

Furthers commands you need to paste any 8 planet name after done typing

Planets and Space Stuff List: Earth, Venus, Moon, Uranus, Sun, Mercury , Saturn, Jupiter, Mars

/dsb-space: returns an planet image random and random fact about the planet

/dsb-space-img: returns a random image of the planet

/dsb-space-fact: returns an random fact about the planet.

## Required Permissions & Scopes

To function properly, this app requires the following scopes configured in the Slack Developer Dashboard under **OAuth & Permissions**:

### Bot Token Scopes
* `commands` — Allows the bot to add and listen to custom slash commands (like `/dsb-space-img`).
* `chat:write` — Allows the bot to send space images and post responses back into your channels.
* `app_mentions:read` — Allows the bot to see and respond to direct mentions (like `@CalcuGoal`).
* `channels:history` — Allows the bot to view messages and content in public channels it has been added to.

### App-Level Scopes
* `connections:write` — Required to enable **Socket Mode** so the bot can safely communicate with Slack via WebSockets 24/7 on Nest.
