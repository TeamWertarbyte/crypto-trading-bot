import now from 'performance-now'
import Promise from 'bluebird'
import log from 'fancy-log'
import {timeParse} from 'd3-time-format'
import {ema} from 'react-stockcharts/lib/indicator'

const parseDate = timeParse('%Y-%m-%dT%H:%M:%S')

Promise.config({
  cancellation: true
})

const INVEST_HOLD_OR_REJECT = {
  HOLD: 'HOLD',
  INVEST: 'INVEST',
  REJECT: 'REJECT',
  NONE: 'NONE'
}

/**
 * This bot trades with ema crossings
 * Buy if positive ticks are reached
 * Sell if negative ticks are reached or to old to hold
 */
export default class Bot {
  constructor(exchange, settings) {
    this.exchange = exchange
    this.settings = settings
    this.currencies = []
    this.bitcoin = {}
  }

  /**
   * Main loop for every iteration
   * @returns {Promise<void>}
   */
  async start() {
    const start = now()
    log.info(`########## Started ichimoku ${process.env.SOURCE_COMMIT} ##########`)

    this.settings.cancelOpenOrdersOnStart && await this.cancelOldOrders()

    await this.fetchMarkets()
    await this.fetchBalances()

    await this.filterCurrenciesByMarkets(this.settings.markets)
    await this.injectMarketSummaries(this.currencies)

    await this.collectRevenue(this.currencies)

    await this.injectCandleData(this.currencies)
    await this.injectKeyFigures(this.currencies)
    await this.countEmaCrossPointTicks(this.currencies)
    await this.injectClosedOrderHistory(this.currencies)

    await this.injectMarketSummaries(this.currencies)
    await this.evaluateInvestHoldOrReject(this.currencies)

    await this.rejectBadInvestments(this.currencies)
    await this.invest(this.currencies)

    log.info(`########## Finished ${(now() - start).toFixed(5)} ms ##########`)
  }

  /**
   * Cancels old buy or sell orders to prevent zombies
   * @returns {Promise<void>}
   */
  async cancelOldOrders() {
    const start = now()
    const openOrders = await this.exchange.getOpenOrders()

    if (openOrders.length > 0) {
      for (let openOrder of openOrders) {
        const elapsedHours = (new Date() - new Date(openOrder.Opened)) / 1000 / 60 / 60
        if (elapsedHours > this.settings.maxHoursToHoldOrder) {
          log.info(`Cancel ${openOrder.OrderType} on ${openOrder.Exchange} du to older than ${this.settings.maxHoursToHoldOrder} hours`)
          await this.exchange.cancel({uuid: openOrder.OrderUuid})
        }
      }
      log.info(`Canceled old orders ${(now() - start).toFixed(5)} ms`)
    }
  }

  /**
   * Fetches all markets with baseCurrency BTC
   * @returns {Promise<void>}
   */
  async fetchMarkets() {
    const start = now()
    this.currencies = await this.exchange.getMarkets()

    // remove other market than BTC for now
    this.currencies = this.currencies.filter(c => c.BaseCurrency === 'BTC' && c.IsActive)
    log.info(`Fetched currencies ${(now() - start).toFixed(5)} ms`)
  }

  /**
   * Fetches personal balances
   * @returns {Promise<void>}
   */
  async fetchBalances() {
    const start = now()
    const balances = await this.exchange.getBalances()
    for (let currency of this.currencies) {
      const balance = balances.find((b) => b.Currency === currency.MarketCurrency)
      if (balance) {
        currency.balance = balance
      } else {
        currency.balance = null
      }
    }

    this.bitcoin = balances.find((b) => b.Currency === 'BTC')

    log.info(`Fetched balances ${(now() - start).toFixed(5)} ms`)
  }

  /**
   * Adds marketSummaries to markets
   * @param data
   * @returns {Promise<void>}
   */
  async injectMarketSummaries(data) {
    const start = now()

    const marketSummaries = await this.exchange.getMarketSummaries({_: Date.now()})

    await Promise.map(data, async (d) => {
      const marketSummary = marketSummaries.find((ms) => d.BaseCurrency === ms.Market.BaseCurrency && d.MarketCurrency === ms.Market.MarketCurrency)
      d.marketSummary = marketSummary.Summary
    })

    log.info(`Injected market summaries ${(now() - start).toFixed(5)} ms`)
  }

  /**
   * Filters markets by config.markets
   * @param markets
   * @returns {Promise<void>}
   */
  async filterCurrenciesByMarkets(markets) {
    const start = now()

    this.currencies = this.currencies.filter(c => markets.includes(c.MarketCurrency) || (c.balance && c.balance.Available > 0))

    log.info(`Filtered currencies by base selected markets ${(now() - start).toFixed(5)} ms`)
  }

  /**
   * Adds candle data to further calculation
   * @param data
   * @returns {Promise<void>}
   */
  async injectCandleData(data) {
    const start = now()
    const _ = Date.now()

    // Using USDT disabled currently
    /* const USDT_BTC = await this.exchange.getCandles({
       marketName: 'USDT-BTC',
       tickInterval: this.settings.tickInterval,
       _
     })*/

    await Promise.map(data, async (d) => {
      d.candles = await this.exchange.getCandles({
        marketName: `BTC-${d.MarketCurrency}`,
        tickInterval: this.settings.tickInterval,
        _
      })
      d.candles = d.candles.map((c, i) => this.parseCandleData(c))
    }, {concurrency: 3})

    log.info(`Injected candle data ${(now() - start).toFixed(5)} ms`)
  }

  // Using USDT disabled currently
  /*  parseCandleData (d, USDT_BTC) {
      return {
        date: parseDate(d.T),
        open: USDT_BTC.O * d.O,
        high: USDT_BTC.H * d.H,
        low: USDT_BTC.L * d.L,
        close: USDT_BTC.C * d.C,
        volume: d.V
      }
    }*/

  parseCandleData(d) {
    return {
      date: parseDate(d.T),
      open: d.O,
      high: d.H,
      low: d.L,
      close: d.C,
      volume: d.V
    }
  }

  /**
   * Adds important numbers for calculation and their buy/sell decision
   * @param data
   * @returns {Promise<void>}
   */
  async injectKeyFigures(data) {
    const start = now()

    await Promise.map(data, async (d) => {
      d.keyFigures = await this.calculateKeyFigures(d.candles)
    })

    log.info(`Calculated key figures ${(now() - start).toFixed(5)} ms`)
  }

  /**
   * Counts positive and negative ema crossing ticks
   * @param data
   * @returns {Promise<void>}
   */
  async countEmaCrossPointTicks(data) {
    const start = now()

    await Promise.map(data, async (d) => {
      const latestKeyFigures = d.keyFigures[d.keyFigures.length - 1]
      const latestEmaDifference = latestKeyFigures.ema26 - latestKeyFigures.ema9

      d.positiveTicks = 0
      d.negativeTicks = 0

      for (let i = d.keyFigures.length - 1; i > 0; i--) {
        const keyFigures = d.keyFigures[i]
        const emaDifference = keyFigures.ema26 - keyFigures.ema9

        if (latestEmaDifference > 0 && emaDifference > 0) {
          d.negativeTicks++
        } else if (latestEmaDifference < 0 && emaDifference < 0) {
          d.positiveTicks++
        } else {
          break
        }
      }
    })

    log.info(`Counted ticks since last ema crossover ${(now() - start).toFixed(5)} ms`)
  }

  /**
   * Calculates emal26 and ema9
   * @param data
   * @returns {*}
   */
  calculateKeyFigures(data) {
    const ema26 = ema()
        .id(0)
        .options({windowSize: 26})
        .merge((d, c) => {
          d.ema26 = c
        })
        .accessor(d => d.ema26)

    const ema9 = ema()
        .id(1)
        .options({windowSize: 9})
        .merge((d, c) => {
          d.ema9 = c
        })
        .accessor(d => d.ema9)

    return ema26(ema9(data))
  }

  /**
   * Adds order history
   * @param data
   * @returns {Promise<void>}
   */
  async injectClosedOrderHistory(data) {
    const start = now()

    await Promise.map(data, async (d) => {
      d.orderHistory = await this.exchange.getOrderHistory({
        market: `BTC-${d.MarketCurrency}`
      })
    }, {concurrency: 10})

    log.info(`Injected closed orders ${(now() - start).toFixed(5)} ms`)
  }

  /**
   * Decide wether to buy, sell or hold asset
   * @param data
   * @returns {Promise<void>}
   */
  async evaluateInvestHoldOrReject(data) {
    const start = now()

    await Promise.map(data, async (d) => {
      d.holdOrReject = INVEST_HOLD_OR_REJECT.HOLD

      if (d.balance && d.balance.Available > 0) {
        if (d.negativeTicks >= this.settings.minNegativeTicks) {
          log.info(`Should reject ${d.MarketCurrency} due to ${d.negativeTicks} negative ema ticks`)
          d.holdOrReject = INVEST_HOLD_OR_REJECT.REJECT
        } else if (d.balance.Available * d.marketSummary.Bid < this.settings.btcPerInvest * (1 - this.settings.maxEffectiveLoss / 100)) {
          log.info(`Should reject ${d.MarketCurrency} due to falling below ${this.settings.btcPerInvest} btc`)
          d.holdOrReject = INVEST_HOLD_OR_REJECT.REJECT
        }
      } else if (!d.balance || (d.balance && d.balance.Available === 0)) {
        if (d.positiveTicks >= this.settings.minPositiveTicks) {
          log.info(`Should invest in ${d.MarketCurrency} due to ${d.positiveTicks} positive ema ticks`)
          d.holdOrReject = INVEST_HOLD_OR_REJECT.INVEST
        }
      }
    })
    log.info(`Evaluated options ${(now() - start).toFixed(5)} ms`)
  }

  /**
   * Sell asset
   * @param data
   * @returns {Promise<void>}
   */
  async rejectBadInvestments(data) {
    const start = now()

    await Promise.map(data, async (d) => {
      if (d.holdOrReject === INVEST_HOLD_OR_REJECT.REJECT) {
        if (d.marketSummary.Bid * d.balance.Available >= this.settings.minimumSellBalanceInBTC && d.balance.Available > d.MinTradeSize) {
          try {
            await this.exchange.sellLimit({
              market: `${d.BaseCurrency}-${d.MarketCurrency}`,
              quantity: d.balance.Available,
              rate: (d.marketSummary.Bid - this.settings.rateSellBuyExtraBtc)
            })
          } catch (e) {
            log.info(e)
          }
          log.info(`${d.MarketCurrency} placed REJECT SELL order`)
        }
      }
    }, {concurrency: 20})
    log.info(`Rejected investments ${(now() - start).toFixed(5)} ms`)
  }

  /**
   * Invest in asset
   * @param data
   * @returns {Promise<void>}
   */
  async invest(data) {
    const start = now()

    let buyCounter = 0

    // Sort by tick count from last ema crossover
    data.sort((a, b) => a.positiveTicks - b.positiveTicks)
    for (let d of data) {
      if (this.bitcoin.Available > this.settings.btcPerInvest + this.settings.btcBuffer) {
        if (d.holdOrReject === INVEST_HOLD_OR_REJECT.INVEST) {
          const quantity = (this.settings.btcPerInvest - 0.00000623) / d.marketSummary.Ask

          if (quantity > d.MinTradeSize) {
            try {
              await this.exchange.buyLimit({
                market: `${d.BaseCurrency}-${d.MarketCurrency}`,
                quantity,
                rate: (d.marketSummary.Ask + this.settings.rateSellBuyExtraBtc)
              })
              buyCounter++
              this.bitcoin.Available -= this.settings.btcPerInvest
              log.info(`Invested ${this.settings.btcPerInvest} bitcoin in ${d.MarketCurrency} for ${quantity} amount`)
            } catch (e) {
              log.info(e)
            }
          }
        }
      } else {
        log.info(`Not enough btc left to invest. Keep saving more!`)
        break
      }
    }

    log.info(`Invested ${this.settings.btcPerInvest * buyCounter} btc in ${buyCounter} options ${(now() - start).toFixed(5)} ms`)
  }

  /**
   * Scoops off some sweet earnings
   * @param data
   * @returns {Promise<void>}
   */
  async collectRevenue(data) {
    const start = now()

    await Promise.map(data, async (d) => {
      if (d.balance && d.balance.Available > 0) {
        const revenue = (d.balance.Available * d.marketSummary.Bid) - this.settings.btcPerInvest
        const quantity = revenue / d.marketSummary.Bid
        if (revenue > 0 && revenue >= this.settings.minimumSellBalanceInBTC && quantity > d.MinTradeSize) {
          try {
            await this.exchange.sellLimit({
              market: `${d.BaseCurrency}-${d.MarketCurrency}`,
              quantity,
              rate: (d.marketSummary.Bid - this.settings.rateSellBuyExtraBtc)
            })
          } catch (e) {
            log.info(e)
          }
          log.info(`${d.MarketCurrency} placed REVENUE SELL order for ${revenue} BTC`)
        }
      }
    })
    log.info(`Collected revenue ${(now() - start).toFixed(5)} ms`)
  }
}