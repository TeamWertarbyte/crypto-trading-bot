// @ts-ignore
import log from 'fancy-log';
// @ts-ignore
import { ema } from 'react-stockcharts/lib/indicator';
import { EvaluationInterface } from './types';
import { BittrexApi } from '../api';
import Configuration from '../configuration/Configuration';
import { Balance, Candle, MarketDecision } from '../api/types';
import { CandleReactStockCharts } from '../bot/types';
import { sleep } from '../utils';
import { EMAShortLong } from '../configuration/types';

export class EMAEvaluation implements EvaluationInterface {
  api: BittrexApi;
  config: Configuration;

  constructor(api: BittrexApi, config: Configuration) {
    this.api = api;
    this.config = config;
  }

  private getEMAConfiguration = (currencySymbol: string): EMAShortLong => {
    let configuration = this.config.emaConfiguration.default;

    if (this.config.emaConfiguration.override?.length) {
      for (const override of this.config.emaConfiguration.override) {
        if (override.coins.includes(currencySymbol)) {
          configuration = {
            l: override.l,
            s: override.s
          };
          break;
        }
      }
    }

    return configuration;
  };

  private calculateEMA = (
    candles: Candle[],
    emaConfiguration: EMAShortLong
  ): CandleReactStockCharts[] => {
    const parsedCandles: CandleReactStockCharts[] = candles.map((candle) => ({
      ...candle,
      date: candle.startsAt,
      emaS: 0,
      emaL: 0
    }));

    const emaL = ema()
      .id(0)
      .options({ windowSize: emaConfiguration.l })
      .merge((d: CandleReactStockCharts, c: number) => {
        d.emaL = c;
      })
      .accessor((d: CandleReactStockCharts) => d.emaL);

    const emaS = ema()
      .id(1)
      .options({ windowSize: emaConfiguration.s })
      .merge((d: CandleReactStockCharts, c: number) => {
        d.emaS = c;
      })
      .accessor((d: CandleReactStockCharts) => d.emaS);

    emaL(emaS(parsedCandles));
    return parsedCandles;
  };

  private countTicks = (
    data: CandleReactStockCharts[]
  ): { positiveTicks: number; negativeTicks: number } => {
    const latestKeyFigure = data[data.length - 1];
    const latestEmaDifference = latestKeyFigure.emaL - latestKeyFigure.emaS;

    let positiveTicks = 0;
    let negativeTicks = 0;

    for (let i = data.length - 1; i > 0; i--) {
      const { emaL, emaS } = data[i];
      const emaDifference = emaL - emaS;

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

  evaluate = async (
    marketSymbol: string,
    balance?: Balance
  ): Promise<MarketDecision> => {
    let marketDecision: MarketDecision = 'NONE';
    const currencySymbol = marketSymbol.split('-')[0];

    const candles: Candle[] = await this.api.getCandles(
      marketSymbol,
      this.config.tickInterval
    );
    await sleep(1500);

    if (!candles?.length) {
      log.info(`Got empty candles for ${marketSymbol}`);
      return 'NONE';
    }

    const { negativeTicks, positiveTicks } = this.countTicks(
      this.calculateEMA(candles, this.getEMAConfiguration(currencySymbol))
    );

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
    }

    return marketDecision;
  };
}
