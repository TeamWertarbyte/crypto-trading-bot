export type Status = 'ONLINE' | 'OFFLINE';
export type CandleInterval = 'MINUTE_1' | 'MINUTE_5' | 'HOUR_1' | 'DAY_1';

export interface Balance {
  currencySymbol: string;
  total: number;
  available: number;
  updatedAt: Date;
}

export interface BalanceResponse
  extends Omit<Balance, 'total' | 'available' | 'updatedAt'> {
  total: string;
  available: string;
  updatedAt: string;
}

export interface Candle {
  startsAt: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
}

export interface CandleResponse
  extends Omit<
    Candle,
    'open' | 'high' | 'low' | 'close' | 'volume' | 'quoteVolume'
  > {
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
  quoteVolume?: string;
}

export type MainMarket = 'BTC' | 'ETH' | 'EUR' | 'USD' | 'USDT';

export interface Market {
  symbol: string;
  baseCurrencySymbol: string;
  quoteCurrencySymbol: string;
  minTradeSize: number;
  precision: number;
  status: Status;
  createdAt: string;
  notice: string;
  prohibitedIn: string[];
  associatedTermsOfService: string[];
  tags: string[];
}

export type MarketDecision = 'HODL' | 'INVEST' | 'REJECT' | 'NONE';

export interface MarketSummary {
  symbol: string;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
  percentChange?: number;
  updatedAt: string;
}

export interface MarketTicker {
  symbol: string;
  lastTradeRate: number;
  bidRate: number;
  askRate: number;
}

export interface MarketTickerResponse
  extends Omit<MarketTicker, 'lastTradeRate' | 'bidRate' | 'askRate'> {
  lastTradeRate: string;
  bidRate: string;
  askRate: string;
}

export type OrderDirection = 'BUY' | 'SELL';

export type OrderType = 'LIMIT' | 'MARKET' | 'CEILING_LIMIT' | 'CEILING_MARKET';

/**
 * https://bittrex.github.io/api/v3#topic-Placing-Orders
 */
export type TimeInForce =
  | 'GOOD_TIL_CANCELLED'
  | 'IMMEDIATE_OR_CANCEL'
  | 'FILL_OR_KILL'
  | 'POST_ONLY_GOOD_TIL_CANCELLED'
  | 'BUY_NOW'
  | 'INSTANT';

export interface NewOrder {
  marketSymbol: string;
  direction: OrderDirection;
  type: OrderType;
  /**
   * Optional, must be included for non-ceiling orders and excluded for ceiling orders
   */
  quantity?: number;
  /**
   * Optional, must be included for ceiling orders and excluded for non-ceiling orders
   */
  ceiling?: number;
  /**
   * Optional, must be included for LIMIT orders and excluded for MARKET orders
   */
  limit?: number;
  timeInForce: TimeInForce;
  /**
   * client-provided identifier for advanced order tracking (optional)
   */
  clientOrderId?: string;
  /**
   * option to use Bittrex credits for the order (optional)
   */
  useAwards?: boolean;
}

export interface CreatedOrder {
  id: string;
  marketSymbol: string;
  direction: string;
  type: string;
  quantity: number;
  limit: number;
  ceiling: number;
  timeInForce: string;
  clientOrderId: string;
  fillQuantity: number;
  commission: number;
  proceeds: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string;
  orderToCancel: {
    type: string;
    id: string;
  };
}
