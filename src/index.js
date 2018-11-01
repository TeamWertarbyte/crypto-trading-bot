import log from 'fancy-log'
import BittrexClient from './modules/bittrex/index'
import Bot from './modules/bot'
import settings from './config'

log.info('Ichimoku bot is starting')
log.info('This bot trades with the ichimoku trading system')

const exchange = new BittrexClient(settings.apiKey, settings.apiSecret)
const bot = new Bot(exchange, settings)

async function loop() {
  await bot.start()
  setTimeout(() => loop(), settings.refreshTimeout)
}

loop()
