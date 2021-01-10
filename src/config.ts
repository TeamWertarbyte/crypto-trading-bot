import { CandleInterval } from './types';

export interface Config {
  /**
   * Amount for every invest
   */
  amountPerInvest: number;
  /**
   * Your Bittrex API KEY
   */
  bittrexApiKey: string;
  /**
   * Your Bittrex API SECRET
   */
  bittrexApiSecret: string;
  /**
   * Coins to sell as soon as possible and never buy
   */
  blacklist: string[];
  /**
   * If true, all sell and buy requests get skipped
   */
  debug: boolean
  /**
   * Will invest when positive ticks are exactly this number
   */
  exactPositiveTicks: number;
  /**
   * Coins to hodl
   */
  HODL: string[];
  /**
   * Market to trade all coins on. E.g. BTC or USDT
   * Only tested USDT so far
   */
  mainMarket: string;
  /**
   * Will reject when negative ticks are equal or below this number
   */
  minNegativeTicks: number;
  /**
   * Amount in milliseconds to wait before next round
   */
  refreshTimeout: number;
  /**
   * Defines the interval used for candles
   */
  tickInterval: CandleInterval;
}

const config: Config = {
  amountPerInvest: 50.0,
  bittrexApiKey: '',
  bittrexApiSecret: '',
  blacklist: ['DASH', 'GRIN', 'XMR', 'ZEC'],
  debug: true,
  HODL: ['BTC', 'ETH'],
  refreshTimeout: 60000 * 60 * 0.05, // 3 min
  tickInterval: CandleInterval.DAY_1,
  mainMarket: 'USDT',
  minNegativeTicks: 2,
  exactPositiveTicks: 2
};

export default config;
