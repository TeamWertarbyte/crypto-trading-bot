import log from 'fancy-log';
import { BittrexApi } from './modules/api';
import Bot from './modules/bot';
import config from './config';

log.info('Ichimoku bot is starting');
log.info('This bot trades with the ichimoku trading system');

const api = new BittrexApi(config.bittrexApiKey, config.bittrexApiSecret);
const bot = new Bot(api, config);

const loop = async () => {
  await bot.start();
  setTimeout(() => loop(), config.refreshTimeout);
};

loop();
