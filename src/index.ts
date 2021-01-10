require('dotenv').config();

import log from 'fancy-log';
import { BittrexApi } from './modules/api';
import Bot from './modules/bot';
import config from './modules/configuration';

log.info('Ichimoku bot is starting');
log.info('This bot trades with the ichimoku trading system');

if (config.debug) {
  log.info('Debug mode is activated');
  log.info('All buy and sell api requests will get skipped');
  log.info('Will skip reporting');
}

if (!process.env.BITTREX_API_KEY || !process.env.BITTREX_API_SECRET) {
  throw new Error(
    'No BITTREX_API_KEY and or BITTREX_API_SECRET found. Check your environment variables'
  );
}

const api = new BittrexApi(
  process.env.BITTREX_API_KEY,
  process.env.BITTREX_API_SECRET
);
const bot = new Bot(api, config);

const loop = async () => {
  await bot.start();
  setTimeout(() => loop(), config.refreshTimeout);
};

loop();
