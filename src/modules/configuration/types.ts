import { CandleInterval } from '../api/types';

export interface Configuration {
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
   * If true, all buy and sell api requests get skipped
   */
  debug: boolean;
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
