import log from 'fancy-log';

import { BittrexApi } from './modules/api';
import Bot from './modules/bot';
import config from './modules/configuration';

require('dotenv').config();

log.info('Ichimoku bot is starting');
log.info('This bot trades with the ichimoku trading system');

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
