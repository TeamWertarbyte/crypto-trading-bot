import log from 'fancy-log';

import { BittrexApi } from './modules/api';
import Bot from './modules/bot';
import { getConfig } from './modules/configuration';

require('dotenv').config();

log.info('This bot trades with the ichimoku trading system');

if (!process.env.BITTREX_API_KEY || !process.env.BITTREX_API_SECRET) {
  throw new Error(
    'No BITTREX_API_KEY and or BITTREX_API_SECRET found. Check your environment variables'
  );
}

log.info('Loading configuration…');
const config = getConfig();
log.info('Successfully loaded configuration', config);

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
