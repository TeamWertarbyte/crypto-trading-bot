import { CandleInterval, MainMarket } from '../api/types';

export default interface Configuration {
  /**
   * Amount for every invest
   */
  amountPerInvest: number;
  /**
   * Coins to sell as soon as possible and never buy
   */
  blacklist: string[];
  /**
   * If true, all buy and sell api requests get skipped
   */
  debug: boolean;
  /**
   * If true, the bot will call the report function at every end of round
   */
  enableReporting: boolean;
  /**
   * Will invest when positive ticks are exactly this number
   */
  exactPositiveTicks: number;
  /**
   * If true, it will not try to buy tokenized stocks. E.g. prohibited in your country
   */
  ignoreTokenizedStocks: boolean;
  /**
   * Coins to hodl
   */
  HODL: string[];
  /**
   * Market to trade all coins on. E.g. BTC or USDT
   * Only tested USDT so far
   */
  mainMarket: MainMarket;
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
