import CryptoJS from 'crypto-js';
import {
  Balance,
  BalanceResponse,
  Candle,
  CandleInterval,
  CandleResponse,
  CreatedOrder,
  Market,
  MarketSummary,
  MarketTicker,
  MarketTickerResponse,
  NewOrder,
  OrderDirection,
  OrderType,
  TimeInForce
} from '../../types';
import fetch, { Headers, Response } from 'node-fetch';

interface BittrexClientOptions {
  baseUrl: string;
  /**
   * Option to use Bittrex credits for the order
   * Orders with insufficient credits will fail
   */
  useAwards: boolean;
}

/**
 * https://bittrex.github.io/api/v3
 */
export default class BittrexApi {
  apiKey: string;
  apiSecret: string;
  options: BittrexClientOptions;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.options = {
      baseUrl: 'https://api.bittrex.com/v3',
      useAwards: false
    };
  }

  /**
   * https://bittrex.github.io/api/v3#topic-Authentication
   * @param uri
   * @param method
   * @param body
   */
  fetchAuthenticated = async (
    uri: string,
    method: 'GET' | 'POST' | 'DELETE',
    body?: {}
  ): Promise<Response> => {
    const timestamp = new Date().getTime();
    const content = body ? JSON.stringify(body) : '';
    const contentHash = CryptoJS.SHA512(content).toString(CryptoJS.enc.Hex);
    const preSign = [timestamp, uri, method, contentHash].join('');
    const signature = CryptoJS.HmacSHA512(preSign, this.apiSecret).toString(
      CryptoJS.enc.Hex
    );

    const headers = new Headers({
      'Api-Key': this.apiKey,
      'Api-Timestamp': `${timestamp}`,
      'Api-Content-Hash': contentHash,
      'Api-Signature': signature,
      'Content-Type': 'application/json'
    });

    if (method === 'POST') {
      return fetch(uri, {
        headers,
        method,
        body: content
      });
    }

    return fetch(uri, {
      headers,
      method
    });
  };

  getBalance = async (currencySymbol: string): Promise<Balance> => {
    const response = await this.fetchAuthenticated(
      `${this.options.baseUrl}/balances/${currencySymbol}`,
      'GET'
    );
    const data: BalanceResponse = await response.json();

    return {
      available: parseFloat(data.available),
      currencySymbol: data.currencySymbol,
      total: parseFloat(data.total),
      updatedAt: new Date(data.updatedAt)
    };
  };

  getBalances = async (): Promise<Balance[]> => {
    const response = await this.fetchAuthenticated(
      `${this.options.baseUrl}/balances`,
      'GET'
    );
    const data: BalanceResponse[] = await response.json();

    return data.map((d) => ({
      available: parseFloat(d.available),
      currencySymbol: d.currencySymbol,
      total: parseFloat(d.total),
      updatedAt: new Date(d.updatedAt)
    }));
  };

  getMarket = async (marketSymbol: string): Promise<Market> => {
    const response = await fetch(
      `${this.options.baseUrl}/markets/${marketSymbol}`
    );
    return response.json();
  };

  getMarkets = async (): Promise<Market[]> => {
    const response = await fetch(`${this.options.baseUrl}/markets`);
    return response.json();
  };

  getMarketSummaries = async (): Promise<MarketSummary[]> => {
    const response = await fetch(`${this.options.baseUrl}/markets/summaries`);
    return response.json();
  };

  getMarketTicker = async (marketSymbol: string): Promise<MarketTicker> => {
    const response = await fetch(
      `${this.options.baseUrl}/markets/${marketSymbol}/ticker`
    );
    const data: MarketTickerResponse = await response.json();

    return {
      symbol: data.symbol,
      askRate: parseFloat(data.askRate),
      bidRate: parseFloat(data.bidRate),
      lastTradeRate: parseFloat(data.lastTradeRate)
    };
  };

  getCandles = async (
    marketSymbol: string,
    candleInterval: CandleInterval
  ): Promise<Candle[]> => {
    const response = await fetch(
      `${this.options.baseUrl}/markets/${marketSymbol}/candles/${candleInterval}/recent`
    );
    const data: CandleResponse[] = await response.json();

    return data.map((d) => ({
      close: parseFloat(d.close),
      high: parseFloat(d.high),
      low: parseFloat(d.low),
      open: parseFloat(d.open),
      quoteVolume: parseFloat(d.quoteVolume || '0'),
      startsAt: new Date(d.startsAt),
      volume: parseFloat(d.volume || '0')
    }));
  };

  /**
   * https://bittrex.github.io/api/v3#topic-Placing-Orders
   * @param marketSymbol
   * @param quantity
   * @param limit
   */
  buyLimit = async (
    marketSymbol: string,
    quantity: number,
    limit: number
  ): Promise<CreatedOrder> => {
    const body: NewOrder = {
      direction: OrderDirection.BUY,
      marketSymbol,
      quantity,
      timeInForce: TimeInForce.GOOD_TIL_CANCELLED,
      type: OrderType.LIMIT,
      limit
    };

    const response = await this.fetchAuthenticated(
      `${this.options.baseUrl}/orders`,
      'POST',
      body
    );

    return response.json();
  };

  /**
   * https://bittrex.github.io/api/v3#topic-Placing-Orders
   * @param marketSymbol
   * @param quantity
   * @param limit
   */
  sellLimit = async (
    marketSymbol: string,
    quantity: number,
    limit: number
  ): Promise<CreatedOrder> => {
    const body: NewOrder = {
      direction: OrderDirection.SELL,
      marketSymbol,
      quantity,
      timeInForce: TimeInForce.FILL_OR_KILL,
      type: OrderType.LIMIT,
      limit
    };

    const response = await this.fetchAuthenticated(
      `${this.options.baseUrl}/orders`,
      'POST',
      body
    );

    return response.json();
  };

  /**
   * Use this for reporting history
   * @param USDT - total amount of USDT when you would sell all your assets now for LATEST price
   * @param BTC - current market USDT price of BTC
   */
  report = async (USDT: number, BTC: number) => {
    await fetch(
      'https://YOUR_URL_HERE',
      {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
          totalBalance: Math.floor(USDT),
          currentMarketBTC: Math.floor(BTC)
        })
      }
    );
  };
}
