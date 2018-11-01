import { plugins as popsiclePlugins, request } from 'popsicle'
import CryptoJS from 'crypto-js'
import { subscribeToMarkets } from './bittrexSocket'

/**
 * Popsicle middleware for signing GET requests for Bittrex v1.1 API.
 * https://github.com/thebotguys/golang-bittrex-api/wiki/Bittrex-API-Reference-(Unofficial)
 * @param {string} apiSecret API secret of a user
 */
function hmacSign (apiSecret) {
  return function (self, next) {
    self.append('apisign', CryptoJS.HmacSHA512(self.url.toString(), apiSecret))
    return next()
  }
}

const defaultOptions = {
  baseUrl: 'https://bittrex.com/api/v1.1',
  baseUrlv2: 'https://bittrex.com/api/v2.0',
  websockets_baseurl: 'wss://socket.bittrex.com/signalr',
  websockets_hubs: ['CoreHub']
}

const getNonce = () => Math.floor(new Date().getTime() / 1000)

export default class BittrexClient {
  constructor (apiKey, apiSecret, options = {}) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.options = {...defaultOptions, ...options}
  }

  async _publicApiCall (url, params = {}) {
    const result = await request({
      method: 'GET',
      url,
      timeout: 60000,
      query: params
    })
      .use(popsiclePlugins.parse('json'))

    if (result.status === 200) {
      if (result.body.success) {
        return result.body.result
      } else {
        throw new Error(result.body.message)
      }
    } else {
      throw new Error(`Error ${result.status}, ${result.body}`)
    }
  }

  async _credentialsApiCall (url, params = {}) {
    const result = await request({
      method: 'GET',
      url,
      timeout: 60000,
      query: {
        ...params,
        nonce: getNonce(),
        apikey: this.apiKey
      }
    })
      .use(hmacSign(this.apiSecret))
      .use(popsiclePlugins.parse('json'))

    if (result.status === 200) {
      if (result.body.success) {
        return result.body.result
      } else {
        throw new Error(result.body.message)
      }
    } else {
      throw new Error(`Error ${result.status}, ${result.body}`)
    }
  }

  getBtcPrice () {
    return this._publicApiCall(`${this.options.baseUrlv2}/pub/currencies/GetBTCPrice`)
  }
  
  /**
   * Returns blockchain health for the given currency
   * @param currencyName name for currency to check like DASH
   * @returns {Promise}
   */
  getCurrencyInfo (currencyName) {
    return this._publicApiCallV2(`${this.options.baseUrlv2}/pub/Currency/GetCurrencyInfo`, {currencyName})
  }

  getLatestTick (options) {
    return this._publicApiCallV2(`${this.options.baseUrlv2}/pub/Market/GetLatestTick`, options)
  }

  getMarkets () {
    return this._publicApiCall(`${this.options.baseUrl}/public/getmarkets`)
  }

  getCurrencies () {
    return this._publicApiCall(`${this.options.baseUrl}/public/getcurrencies`)
  }

  getTicker (options) {
    return this._publicApiCall(`${this.options.baseUrl}/public/getticker`, options)
  }

  getMarketSummaries (options) {
    return this._publicApiCall(`${this.options.baseUrlv2}/pub/Markets/GetMarketSummaries`, options)
  }

  getMarketSummary (options) {
    return this._publicApiCall(`${this.options.baseUrl}/public/getmarketsummary`, options)
  }

  getOrderBook (options) {
    return this._publicApiCall(`${this.options.baseUrl}/public/getorderbook`, options)
  }

  getMarketHistory (options) {
    return this._publicApiCall(`${this.options.baseUrl}/public/getmarkethistory`, options)
  }

  getCandles (options) {
    return this._publicApiCall(`${this.options.baseUrlv2}/pub/market/GetTicks`, options)
  }

  buyLimit (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/market/buylimit`, options)
  }

  sellLimit (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/market/selllimit`, options)
  }

  sellMarket (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/market/sellmarket`, options)
  }

  cancel (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/market/cancel`, options)
  }

  getOpenOrders (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/market/getopenorders`, options)
  }

  getBalances (callback) {
    return this._credentialsApiCall(`${this.options.baseUrl}/account/getbalances`)
  }

  getBalance (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/account/getbalance`, options)
  }

  getWithdrawalHistory (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/account/getwithdrawalhistory`, options)
  }

  getDepositAddress (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/account/getdepositaddress`, options)
  }

  getDepositHistory (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/account/getdeposithistory`, options)
  }

  getOrderHistory (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/account/getorderhistory`, options)
  }

  getOrder (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/account/getorder`, options)
  }

  withdraw (options) {
    return this._credentialsApiCall(`${this.options.baseUrl}/account/withdraw`, options)
  }

  /**
   * Here are some endpoints from bittrex api v2.0 that may don't work yet
   */

  async _publicApiCallV2 (url, params = {}) {
    const result = await request({
      method: 'POST',
      url,
      timeout: 60000,
      query: {
        ...params,
        nonce: getNonce()
      }
    })
      .use(popsiclePlugins.parse('json'))

    if (result.status === 200) {
      if (result.body.success) {
        return result.body.result
      } else {
        throw new Error(result.body.message)
      }
    } else {
      throw new Error(`Error ${result.status}, ${result.body}`)
    }
  }

  async _credentialsApiCallV2 (url, params = {}) {
    const result = await request({
      method: 'POST',
      url,
      timeout: 60000,
      query: {
        ...params,
        nonce: getNonce(),
        apikey: this.apiKey
      }
    })
      .use(hmacSign(this.apiSecret))
      .use(popsiclePlugins.parse('json'))

    if (result.status === 200) {
      if (result.body.success) {
        return result.body.result
      } else {
        throw new Error(result.body.message)
      }
    } else {
      throw new Error(`Error ${result.status}, ${result.body}`)
    }
  }

  downloadMarketOrderHistory (marketName) {
    return this._credentialsApiCallV2(`${this.options.baseUrlv2}/auth/market/DownloadMarketOrderHistory`, {marketName})
  }

  getOrderHistoryv2 (options) {
    return this._credentialsApiCallV2(`${this.options.baseUrlv2}/key/orders/GetOrderHistory`, options)
  }

  /**
   * Creates a new socket client connected to Bittrex and subscribes it to market changes for the
   * given markets.
   * @param {string[]} markets markets to subscribe to
   * @param {function} callback callback that is called on updates
   * @returns {object} the signalR client
   * @see https://www.npmjs.com/package/signalr-client
   */
  subscribeToMarkets (markets, callback) {
    return subscribeToMarkets(this.options.websockets_baseurl, this.options.websockets_hubs, markets, callback)
  }
}
