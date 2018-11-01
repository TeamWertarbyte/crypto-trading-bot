export default {
  // Your Bittrex API KEY
  apiKey: '',
  // Your Bittrex API SECRET
  apiSecret: '',
  // btc that has to stay on the bank
  btcBuffer: 0.0025,
  // btc amount per invest
  btcPerInvest: 0.005,
  // If true it cancels old orders before doing anything else
  cancelOpenOrdersOnStart: true,
  // BTC markets which the bot should watch out for
  markets: [
    'ADA',
    'DOGE',
    'EMC2',
    'ETC',
    'ETH',
    'FTC',
    'LTC',
    'PAY',
    'SC',
    'XRP',
  ],
  // Maximum Hours to hold an asset
  maxHoursToHoldBalance: 168, // 7 days
  // Amount of hours for an order before it get's canceled
  maxHoursToHoldOrder: 0.5,
  // Bail out if loss is below this % and sell everything that's left from this asset
  maxEffectiveLoss: 60,
  // not used currently
  minEffectiveGain: 3,
  // Minimum amount before a sell decision is made
  minimumSellBalanceInBTC: 0.0005,
  // Used for ema crossing. How many negative ticks before selling
  minNegativeTicks: 3,
  // Used for ema crossing. How many positive ticks before buying
  minPositiveTicks: 2,
  // Little margin to secure sell/buy order
  rateSellBuyExtraBtc: 0.0000000000001, // to secure buy or sell
  // Time interval for bot refresh
  refreshTimeout: 60000 * 60 * 3, // 3 hours
  // Get the candles for a market [“oneMin”, “fiveMin”, “thirtyMin”, “hour”, “day”]
  tickInterval: 'day'
}