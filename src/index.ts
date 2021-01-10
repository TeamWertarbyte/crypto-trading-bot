import log from 'fancy-log';
import { BittrexApi } from './modules/api';
import Bot from './modules/bot';
import config from './modules/configuration';

log.info('Ichimoku bot is starting');
log.info('This bot trades with the ichimoku trading system');

if (config.debug) {
  log.info(
    'Debug mode is activated. All buy and sell api requests get skipped. Skip reporting'
  );
}

const api = new BittrexApi(config.bittrexApiKey, config.bittrexApiSecret);
const bot = new Bot(api, config);

const loop = async () => {
  await bot.start();
  setTimeout(() => loop(), config.refreshTimeout);
};

loop();
