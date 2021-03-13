// @ts-ignore
import log from 'fancy-log';
import now from 'performance-now';

import { BittrexApi } from '../api';
import {
  Balance,
  Market,
  MarketDecision,
  MarketSummary,
  MarketTicker
} from '../api/types';
import Configuration from '../configuration/Configuration';

import { sleep } from '../utils';
import { EMAEvaluation } from '../evaluation/EMAEvaluation';

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

    if (this.config.enableReporting && !this.config.debug) {
      await this.report();
    }

    log.info(`########## Finished ${(now() - start).toFixed(5)} ms ##########`);
  };

  getMarkets = async (): Promise<Market[]> => {
    const start = now();

    const markets: Market[] = await this.api.getMarkets();

    let filtered: Market[] = markets
      .filter(
        ({ quoteCurrencySymbol }) =>
          quoteCurrencySymbol === this.config.mainMarket
      )
      .filter(({ status }) => status === 'ONLINE');

    if (this.config.ignoreTokenizedStocks) {
      filtered = filtered.filter(
        ({ tags }) => !tags.includes('TOKENIZED_SECURITY')
      );
    }

    if (this.config.stableCoins.ignore) {
      filtered = filtered.filter(
        ({ baseCurrencySymbol }) =>
          !this.config.stableCoins.coins.includes(baseCurrencySymbol)
      );
    }

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
      .filter(({ currencySymbol }) =>
        this.config.stableCoins.ignore
          ? !this.config.stableCoins.coins.includes(currencySymbol)
          : true
      )
      .filter(
        ({ currencySymbol }) => !this.config.HODL.includes(currencySymbol)
      );

    await sleep(1500);

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

        if (!this.config.debug && quantity > market.minTradeSize) {
          log.info(
            `${balance.currencySymbol} placed REVENUE SELL order ${quantity} for a total of ${revenue} ${this.config.mainMarket}`
          );
          const response = await this.api.sellLimit(
            market.symbol,
            quantity,
            ticker.bidRate
          );
          log.info(response);
          await sleep(1500);
        }
        await sleep(1500);
      }
      await sleep(1500);
    }

    log.info(`Collected revenue ${(now() - start).toFixed(5)} ms`);
  };

  evaluateMarkets = async (marketSymbols: string[]) => {
    const start = now();
    const emaEvaluation = new EMAEvaluation(this.api, this.config);

    const balances: Balance[] = await this.api.getBalances();
    await sleep(1000);

    for (const marketSymbol of marketSymbols) {
      let decision: MarketDecision = 'NONE';
      const currencySymbol = marketSymbol.split('-')[0];

      if (this.config.HODL.includes(currencySymbol)) {
        decision = 'HODL';
      } else {
        const balance = balances.find(
          (balance) => balance.currencySymbol === currencySymbol
        );

        decision = await emaEvaluation.evaluate(marketSymbol, balance);

        if (decision === 'INVEST') {
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
        } else if (balance && decision === 'REJECT') {
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
