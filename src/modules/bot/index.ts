// @ts-ignore
import log from 'fancy-log';
import now from 'performance-now';
// @ts-ignore
import { ema } from 'react-stockcharts/lib/indicator';

import { BittrexApi } from '../api';
import {
  Balance,
  Candle,
  Market,
  MarketDecision,
  MarketSummary,
  MarketTicker
} from '../api/types';
import Configuration from '../configuration/Configuration';

import { CandleReactStockCharts } from './types';

/**
 * Awaitable sleep to keep API requests/min limit
 * @param ms - duration in milliseconds
 */
const sleep = (ms: number): Promise<any> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export default class Bot {
  api: BittrexApi;
  config: Configuration;

  constructor(api: BittrexApi, config: Configuration) {
    if (config.debug) {
      log.info(
        'Debug mode is activated. All buy and sell api requests will get skipped. Will skip reporting'
      );
    }

    this.api = api;
    this.config = config;
  }

  start = async () => {
    const start = now();
    log.info(`########## Started ichimoku ##########`);

    await this.collectRevenue();

    const markets: Market[] = await this.getMarkets();
    const marketSummaries: MarketSummary[] = await this.getMarketSummaries(
      markets
    );
    await this.evaluateMarkets(marketSummaries.map(({ symbol }) => symbol));

    if (!this.config.debug) {
      // await this.report();
    }

    log.info(`########## Finished ${(now() - start).toFixed(5)} ms ##########`);
  };

  getMarkets = async (): Promise<Market[]> => {
    const start = now();

    const markets: Market[] = await this.api.getMarkets();

    const filtered: Market[] = markets.filter(
      ({ quoteCurrencySymbol, status }) =>
        quoteCurrencySymbol === this.config.mainMarket && status === 'ONLINE'
    );

    log.info(
      `Fetched ${markets.length} and filtered ${filtered.length} ${
        this.config.mainMarket
      } markets ${(now() - start).toFixed(5)} ms`
    );
    return filtered;
  };

  getMarketSummaries = async (markets: Market[]): Promise<MarketSummary[]> => {
    const start = now();

    const marketSummaries: MarketSummary[] = await this.api.getMarketSummaries();

    const filtered: MarketSummary[] = [];
    markets.forEach((market) => {
      const matchedSummary = marketSummaries.find(
        ({ symbol }) => market.symbol === symbol
      );
      if (matchedSummary && matchedSummary.quoteVolume > 0) {
        filtered.push(matchedSummary);
      }
    });

    log.info(
      `Fetched ${marketSummaries.length} and filtered ${
        filtered.length
      } market summaries ${(now() - start).toFixed(5)} ms`
    );
    return filtered;
  };

  /**
   * Sell value above the invested amount
   * Ignore HODL coins
   */
  collectRevenue = async (): Promise<any> => {
    const start = now();

    const balances: Balance[] = (await this.api.getBalances())
      .filter(({ available }) => available > 0)
      .filter(
        ({ currencySymbol }) => !this.config.HODL.includes(currencySymbol)
      );

    await sleep(10000);

    for (const balance of balances) {
      const ticker: MarketTicker = await this.api.getMarketTicker(
        `${balance.currencySymbol}-${this.config.mainMarket}`
      );
      const revenue =
        balance.available * ticker.bidRate - this.config.amountPerInvest;

      if (revenue > 0) {
        const market: Market = await this.api.getMarket(
          `${balance.currencySymbol}-${this.config.mainMarket}`
        );
        const quantity = revenue / ticker.bidRate;

        if (!this.config.debug) {
          if (quantity > market.minTradeSize) {
            const response = await this.api.sellLimit(
              market.symbol,
              quantity,
              ticker.bidRate
            );

            log.info(response);
          }
          log.info(
            `${balance.currencySymbol} placed REVENUE SELL order for ${revenue} ${this.config.mainMarket}`
          );
        }
        await sleep(2500);
      }
      await sleep(1500);
    }

    log.info(`Collected revenue ${(now() - start).toFixed(5)} ms`);
  };

  calculateEMA = (candles: Candle[]): CandleReactStockCharts[] => {
    const parsedCandles: CandleReactStockCharts[] = candles.map((candle) => ({
      ...candle,
      date: candle.startsAt,
      ema9: 0,
      ema26: 0
    }));

    const ema26 = ema()
      .id(0)
      .options({ windowSize: 26 })
      .merge((d: CandleReactStockCharts, c: number) => {
        d.ema26 = c;
      })
      .accessor((d: CandleReactStockCharts) => d.ema26);

    const ema9 = ema()
      .id(1)
      .options({ windowSize: 9 })
      .merge((d: CandleReactStockCharts, c: number) => {
        d.ema9 = c;
      })
      .accessor((d: CandleReactStockCharts) => d.ema9);

    ema26(ema9(parsedCandles));
    return parsedCandles;
  };

  countEMATicks = (
    data: CandleReactStockCharts[]
  ): { positiveTicks: number; negativeTicks: number } => {
    const latestKeyFigure = data[data.length - 1];
    const latestEmaDifference = latestKeyFigure.ema26 - latestKeyFigure.ema9;

    let positiveTicks = 0;
    let negativeTicks = 0;

    for (let i = data.length - 1; i > 0; i--) {
      const { ema26, ema9 } = data[i];
      const emaDifference = ema26 - ema9;

      if (latestEmaDifference > 0 && emaDifference > 0) {
        negativeTicks += 1;
      } else if (latestEmaDifference < 0 && emaDifference < 0) {
        positiveTicks += 1;
      } else {
        break;
      }
    }
    return {
      negativeTicks,
      positiveTicks
    };
  };

  evaluateMarket = async (
    marketSymbol: string,
    negativeTicks: number,
    positiveTicks: number,
    balance: Balance | undefined
  ) => {
    let marketDecision: MarketDecision = 'NONE';
    const currencySymbol = marketSymbol.split('-')[0];

    if (balance && balance.available > 0) {
      if (this.config.blacklist.includes(currencySymbol)) {
        log.info(`Will reject ${marketSymbol} due to blacklist`);
        marketDecision = 'REJECT';
      } else if (negativeTicks >= this.config.minNegativeTicks) {
        log.info(
          `Will reject ${marketSymbol} due to ${negativeTicks} negative ema ticks`
        );
        marketDecision = 'REJECT';
      }

      if (marketDecision === 'REJECT') {
        const ticker = await this.api.getMarketTicker(marketSymbol);
        const market = await this.api.getMarket(marketSymbol);
        if (balance.available > market.minTradeSize) {
          if (!this.config.debug) {
            const response = await this.api.sellLimit(
              market.symbol,
              balance.available,
              ticker.bidRate
            );
            log.info(response);
          }
          log.info(
            `Rejected ${balance.available} of ${marketSymbol} for ${ticker.bidRate} each`
          );
          await sleep(2500);
        }
      }
    } else if (!balance || (balance && balance.available === 0)) {
      if (
        !this.config.blacklist.includes(currencySymbol) &&
        positiveTicks === this.config.exactPositiveTicks
      ) {
        log.info(
          `Should invest in ${marketSymbol} due to ${positiveTicks} positive ema ticks`
        );
        marketDecision = 'INVEST';
      }

      if (marketDecision === 'INVEST') {
        const mainMarket = await this.api.getBalance(this.config.mainMarket);
        if (mainMarket.available > this.config.amountPerInvest) {
          const ticker = await this.api.getMarketTicker(marketSymbol);
          const quantity = this.config.amountPerInvest / ticker.askRate;
          if (!this.config.debug) {
            const response = await this.api.buyLimit(
              marketSymbol,
              quantity,
              ticker.askRate
            );
            log.info(response);
          }
          log.info(
            `Invested ${this.config.amountPerInvest} ${mainMarket.currencySymbol} to buy ${quantity} of ${marketSymbol}`
          );
          await sleep(2500);
        } else {
          log.info(
            `${mainMarket.available} ${this.config.mainMarket} is not enough for further investments `
          );
        }
        await sleep(1000);
      }
    }
  };

  evaluateMarkets = async (marketSymbols: string[]) => {
    const start = now();

    const balances: Balance[] = await this.api.getBalances();
    await sleep(1000);

    for (const marketSymbol of marketSymbols) {
      let decision: MarketDecision = 'NONE';

      if (this.config.HODL.includes(marketSymbol)) {
        decision = 'HODL';
      } else {
        const candles: Candle[] = await this.api.getCandles(
          marketSymbol,
          this.config.tickInterval
        );
        await sleep(1500);
        if (candles?.length) {
          const { negativeTicks, positiveTicks } = this.countEMATicks(
            this.calculateEMA(candles)
          );
          const balance = balances.find(
            ({ currencySymbol }) =>
              currencySymbol === marketSymbol.split('-')[0]
          );

          await this.evaluateMarket(
            marketSymbol,
            negativeTicks,
            positiveTicks,
            balance
          );
        } else {
          log.info(`Got empty candles for ${marketSymbol}`);
        }
      }
    }

    log.info(
      `Evaluated ${marketSymbols.length} markets in total ${(
        now() - start
      ).toFixed(5)} ms`
    );
  };

  report = async () => {
    const balances = (await this.api.getBalances()).filter(
      ({ available }) => available > 0
    );
    let total = (await this.api.getBalance(this.config.mainMarket)).available;
    const btcTicker = await this.api.getMarketTicker(
      `BTC-${this.config.mainMarket}`
    );
    await sleep(3500);

    for (const balance of balances) {
      const ticker = await this.api.getMarketTicker(
        `${balance.currencySymbol}-${this.config.mainMarket}`
      );
      const worth = balance.available * ticker.lastTradeRate;
      if (worth) {
        total += worth;
      }
      await sleep(1000);
    }

    await this.api.report(total, btcTicker.lastTradeRate);
    log.info(`Called report webhook`);
  };
}
