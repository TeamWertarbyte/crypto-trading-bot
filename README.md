# Cryptocurrency Trading Bot ![version](https://img.shields.io/badge/Version-2021.3.0-blue)
I'm using this bot for a long time now and wanted to share it. 

Feel free to make it your own. PRs are welcome!

## USE AT YOUR OWN RISK
A trading bot that does what you order him to do (use at your own risk) I'm not responsible for anything

## EMA crossover strategy
It's using the ema crossover strategy

https://www.theforexchronicles.com/the-ema-5-and-ema-20-crossover-trading-strategy/

![EMA crossing strategy](ema-crossing.png)

## Donations

To support this project, you can make a donation to its current maintainer:

[![paypal](paypal.gif)](https://paypal.me/Saschb2b)

Bitcoin: 19yG1s5s1s4JnfdsNLfVy3GS6GYPxgG3BY

Ethereum: 0x2146e4337b4d7b17899b71694456b13f434fb3e4

Doge: DJ6JwaBJ6QwyaDLfYsNdre52sf1C7Abm5B

Litecoin: LSVno86JENvnEmdCrY6sVNGGe7KM2HyLKm

## Requirements
Node.js

As package manager install yarn https://classic.yarnpkg.com/en/docs/install

## Configuration

### Bittrex API key and API secret
How to get: https://support.coinigy.com/hc/en-us/articles/360001123973-How-do-I-find-my-API-key-on-Bittrex-com-

Set `BITTREX_API_KEY` and `BITTREX_API_SECRET` as environment variables.

Easiest way is to add an `.env` file into the root project folder `./.env` wit the content
```
BITTREX_API_KEY=YOUR_BITTREX_API_KEY
BITTREX_API_SECRET=YOUR_BITTREX_API_SECRET
```
otherwise see the provided `.env.template` file.

If no keys were found you'll get an error message `No BITTREX_API_KEY and or BITTREX_API_SECRET found. Check your environment variables`

### Adapt the config
Change the configuration parameters to your liking `config.json`

For more details see the documentation in `./modules/configuration/Configuration.ts`

### (optional) Setup crash reporting with sentry
Create a free monitoring project https://sentry.io/

Set `SENTRY_DSN` as environment variable.

## Run and development

### Build and start
```
yarn
yarn start
```

This will create a `/dist` folder and start the containing `/dist/index.js` file

### Build bundle
```
yarn
yarn build
```

This will create a `/dist` folder containing the created `.js` files. You could now deploy it on any server you like

### Development
```
yarn
yarn start:dev
```

This will start the bot in a watch mode. On every code change it will recompile and restart

## Discussion and wiki

Feel free to join the [discussion](https://github.com/TeamWertarbyte/crypto-trading-bot/discussions) and [wiki](https://github.com/TeamWertarbyte/crypto-trading-bot/wiki) here on github
