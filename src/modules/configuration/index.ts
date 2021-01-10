import { CandleInterval, MainMarket } from '../api/types';

import { Configuration } from './types';

const config: Configuration = {
  amountPerInvest: 50.0,
  blacklist: ['DASH', 'GRIN', 'XMR', 'ZEC'],
  debug: false,
  HODL: ['BTC', 'ETH'],
  refreshTimeout: 60000 * 60 * 0.05, // 3 min
  tickInterval: CandleInterval.DAY_1,
  mainMarket: MainMarket.USDT,
  minNegativeTicks: 2,
  exactPositiveTicks: 2
};

export default config;
