import BaseConnection, { Transaction, Order } from "./base";
import * as moment from "moment";
import * as ccxt from "ccxt";
import { sleep } from "../utils";
import * as _ from "lodash";

interface ExchangeCredentials {
  apiKey: string;
  secret: string;
  password?: string;
}

/**
 * Create ccxt exchange object
 *
 * @param {string} name      - Name of exchange
 * @param {string} creds     - User's exchange credentials
 * @param {number} rateLimit - API request rate limit
 * @return {ccxt.Exchange} ccxt exchange instance
 */
export function getExchange(
  name: string,
  creds: ExchangeCredentials,
  rateLimit: number = 1000
): ccxt.Exchange {
  const exchanges: any = {
    // public or private access
    bittrex: new ccxt.bittrex({ ...creds, enableRateLimit: true }),
    coinbase: new ccxt.coinbase({ ...creds, enableRateLimit: true }),
    coinbasepro: new ccxt.coinbasepro({ ...creds, enableRateLimit: true }),
    kucoin: new ccxt.kucoin({ ...creds, enableRateLimit: true }),
    // only public access
    gateio: new ccxt.gateio({ ...creds, enableRateLimit: true }),
    binance: new ccxt.binance({ ...creds, enableRateLimit: true }),
    bitstamp: new ccxt.bitstamp({ ...creds, enableRateLimit: true }),
    ftx: new ccxt.ftx({ ...creds, enableRateLimit: true }),
    hitbtc: new ccxt.hitbtc({ ...creds, enableRateLimit: true }),
    huobipro: new ccxt.huobipro({ ...creds, enableRateLimit: true }),
    kraken: new ccxt.kraken({ ...creds, enableRateLimit: true }),
    okcoin: new ccxt.okcoin({ ...creds, enableRateLimit: true }),
    poloniex: new ccxt.poloniex({ ...creds, enableRateLimit: true }),
    yobit: new ccxt.yobit({ ...creds, enableRateLimit: true }),
  };
  const exchange: ccxt.Exchange | undefined = exchanges[name];
  if (!exchange) throw new Error(`"${name}" is not a registered Exchange.`);
  if (rateLimit) exchange.rateLimit = rateLimit;
  return exchange;
}

/**
 * A base class to support general ccxt exchange operations
 */
export default class ccxtConnection extends BaseConnection {
  quoteCurrency: string;
  markets: Array<string>;
  access: string;
  /**
   * Create BaseConnection instance
   * @param {string} name - Name of exchange (Ex: coinbase)
   * @param {any} credentials - API creds of exchange
   * @param {any} params - (Optional) Additional paramaters
   */
  constructor(name: string, credentials: any = {}, params: any = {}) {
    super(name, "api", params);
    this.credentials = credentials;
    this.access = credentials && credentials.apiKey ? "private" : "public";
    this.connection = getExchange(name, credentials, params.rateLimit);
    this.quoteCurrency = "USD";
    this.markets = [];
  }

  /**
   * HELPER: Format transaction
   *
   * @param {any} transaction - Unformatted cctx unified transaction
   * @param {string} forceType - (Optional) Type to assign to transaction
   * @return {Transaction} Formatted transaction
   */
  _formatTransaction(transaction: any, forceType?: string): Transaction {
    const fee: number = transaction.fee ? transaction.fee.cost : 0;
    const type: string = forceType ? forceType : _.kebabCase(transaction.type);
    const formatted: Transaction = {
      id: transaction.id,
      timestamp: moment.utc(transaction.timestamp).toDate(),
      type: type,
      baseCurrency: transaction.currency,
      baseQuantity: transaction.amount,
      baseUsdPrice: 0,
      feeCurrency: transaction.fee ? transaction.fee.currency : "USD",
      feeQuantity: fee,
      feePrice: 0,
      feeTotal: 0,
      subTotal: 0,
      total: 0,
    };
    if (!this.requireUsdValuation) {
      formatted.feePrice =
        formatted.feeCurrency === "USD" ? formatted.feeQuantity : 0;
      formatted.feeTotal = formatted.feePrice * formatted.feeQuantity;
      formatted.subTotal = transaction.amount;
      formatted.total = transaction.amount + fee;
    }
    return formatted;
  }

  /**
   * HELPER: Format orders
   *
   * @param {any} order - Unformatted cctx unified transaction
   * @return {Transaction} Formatted transaction
   */
  _formatOrder(order: any): Order {
    const fee: number = order.fee ? order.fee.cost : 0;
    const feeCurrency: string = order.fee ? order.fee.currency : "USD";
    const price: number = order.price ? order.price : order.average;
    let [baseCurrency, quoteCurrency] = order.symbol.split("/");
    let baseQuantity: number = order.filled;
    let quoteQuantity: number = order.cost;

    const formatted: Order = {
      id: order.id,
      timestamp: moment.utc(order.timestamp).toDate(),
      type: order.side,
      baseCurrency: baseCurrency,
      baseQuantity: baseQuantity,
      baseUsdPrice: 0,
      quoteCurrency: quoteCurrency,
      quoteQuantity: quoteQuantity,
      quotePrice: price,
      quoteUsdPrice: 0,
      feeCurrency: feeCurrency,
      feeQuantity: fee,
      feePrice: this.stableCurrencies.includes(feeCurrency) ? 1 : 0,
      feeTotal: 0,
      subTotal: 0,
      total: 0,
    };
    if (
      !this.requireUsdValuation ||
      this.stableCurrencies.includes(quoteCurrency)
    ) {
      formatted.subTotal = order.cost;
      formatted.total =
        order.side === "buy" ? order.cost + fee : order.cost - fee;
      formatted.quoteUsdPrice = 1;
      formatted.baseUsdPrice = quoteQuantity / baseQuantity;
      // formatted.quotePrice = formatted.baseUsdPrice / formatted.quoteUsdPrice;
      if (formatted.feeCurrency === formatted.quoteCurrency) {
        formatted.feeTotal = formatted.feePrice * formatted.feeQuantity;
      }
    }
    return formatted;
  }

  /**
   * HELPER
   * @description Check if params are satified for call
   * @param {string} method CCXT exchange method name
   * @param {string} symbol Currency symbol
   * @return {void}
   */
  _paramCheck(method: string, symbol?: string): void {
    if (!this.connection.has[method]) {
      throw Error(
        `${this.connection.name} does not support ${method} function`
      );
    }
    if (this.requireSymbols && !symbol) {
      throw Error(`${this.connection.name}.${method} requires a symbol`);
    }
  }

  /**
   * @description Initialize exchange by fetching balances and loading markets
   * @override BaseConnection.initialize
   * @param {boolean} forceReload - (Optional) Additional paramaters
   * @return {Promise<void>}
   */
  async initialize(forceReload: boolean = false): Promise<void> {
    if (!this.initialized || forceReload) {
      await this.connection.loadMarkets();
      this.symbols = this.connection.symbols;
      this.markets = Object.values(this.connection.markets)
        .filter((market: any) => market.active)
        .map((market: any) => market.symbol);
      if (this.access === "private") {
        this.balances = await this.getBalances();
      } else {
        const quotes: Array<string> = _.uniq(
          this.markets.map((currencyPair: string) => currencyPair.split("/")[1])
        );
        // detect USD (or equivelent) quote currency
        if (!quotes.includes("USD")) {
          if (quotes.includes("USDC")) {
            this.quoteCurrency = "USDC";
          } else if (quotes.includes("USDT")) {
            this.quoteCurrency = "USDT";
          }
        }
      }
      this.initialized = true;
    }
  }

  /**
   * @description Fetch Account Balances
   * @override BaseConnection.getBalances
   * @return {Promise<any>} Account balance object
   */
  async getBalances(): Promise<any> {
    if (this.access === "private") {
      const balances: any = await this.connection.fetchBalance();
      return balances;
    }
    return [];
  }

  /**
   * @description Fetch Account Withdrawals
   * @override BaseConnection.getWithdrawals
   * @param {string} symbol Currency symbol
   * @param {string} key (Default=Send) Transaction type key
   * @param {number} since (Optional) Timestamp to get transactions since
   * @param {number} limit (Optional) Max number of entries per request
   * @return {Promise<Array<any>>} Array of withdrawal objects
   */
  async getWithdrawals(
    symbol?: string,
    key: string = "send",
    since?: number,
    limit: number = 100
  ): Promise<Array<any>> {
    if (this.access === "private") {
      this._paramCheck("fetchWithdrawals", symbol);
      let withdrawals: any = await this.connection.fetchWithdrawals(
        symbol,
        since,
        limit
      );
      withdrawals = withdrawals.map((deposit: any) =>
        this._formatTransaction(deposit, key)
      );
      if (since) {
        withdrawals = withdrawals.filter(
          (deposit: Transaction) => deposit.timestamp.getTime() > since
        );
      }
      if (this.requireUsdValuation) {
        withdrawals = withdrawals.map((withdrawal: Transaction) =>
          this.quoteTransaction(withdrawal)
        );
        withdrawals = await Promise.all(withdrawals);
      }
      return withdrawals;
    }
    return [];
  }

  /**
   * @description Fetch Account Deposits
   * @override BaseConnection.getDeposits
   * @param {string} symbol Currency symbol
   * @param {string} key (Default=Receive) Transaction type key
   * @param {number} since (Optional) Timestamp to get transactions since
   * @param {number} limit (Optional) Max number of entries per request
   * @return {Promise<Array<any>>} Array of deposit objects
   */
  async getDeposits(
    symbol?: string,
    key: string = "receive",
    since?: number,
    limit: number = 100
  ): Promise<Array<any>> {
    if (this.access === "private") {
      this._paramCheck("fetchDeposits", symbol);
      let deposits: any = await this.connection.fetchDeposits(
        symbol,
        since,
        limit
      );
      deposits = deposits.map((deposit: any) =>
        this._formatTransaction(deposit, key)
      );
      if (since) {
        deposits = deposits.filter(
          (deposit: Transaction) => deposit.timestamp.getTime() > since
        );
      }
      if (this.requireUsdValuation) {
        deposits = deposits.map((deposit: Transaction) =>
          this.quoteTransaction(deposit)
        );
        deposits = await Promise.all(deposits);
        deposits = deposits.filter((tx: Transaction) => tx.baseUsdPrice !== 0);
      }
      return deposits;
    }
    return [];
  }

  /**
   * @description Fetch Account Orders
   * @override BaseConnection.getOrders
   * @param {string} symbol Currency symbol
   * @param {number} since (Optional) Timestamp to get transactions since
   * @param {number} limit (Optional) Max number of entries per request
   * @return {Promise<Array<any>>} Array of order objects
   */
  async getOrders(
    symbol?: string,
    since?: number,
    limit: number = 100
  ): Promise<Array<any>> {
    if (this.access === "private") {
      this._paramCheck("fetchClosedOrders", symbol);
      let orders = await this.connection.fetchClosedOrders(
        symbol,
        since,
        limit
      );
      orders = orders.filter((order: any) => order.filled > 0);
      orders = orders.map((order: any) => this._formatOrder(order));
      if (since) {
        orders = orders.filter(
          (order: Order) => order.timestamp.getTime() > since
        );
      }
      if (this.requireUsdValuation) {
        orders = orders.map((order: Order) => this.quoteOrder(order));
        orders = await Promise.all(orders);
        orders = orders.map((order: Order) =>
          this._attemptedSwapConversion(order)
        );
      }
      return orders;
    }
    return [];
  }

  /**
   * @description Fetch all account transactions (withdrawals, deposits, and orders)
   * @override BaseConnection.getLedger
   * @param {string} symbol Currency symbol
   * @param {number} since (Optional) Timestamp to get transactions since
   * @param {number} limit (Optional) Max number of entries per request
   * @return {Promise<any>} Array of withdrawal objects
   */
  async getLedger(
    symbol?: string,
    since?: number,
    limit: number = 100
  ): Promise<any> {
    if (this.access === "private") {
      this._paramCheck("fetchLedger", symbol);
      const ledger = await this.connection.fetchLedger(symbol, since, limit);
      // return ledger.map((transaction: any) => _formatTransaction(transaction));
      return ledger;
    }
    return [];
  }

  /**
   * @description Fetch account transactions (withdrawals, deposits, and orders)
   * @override BaseConnection.getTransactions
   * @param {string} symbol Currency symbol
   * @param {number} since (Optional) Timestamp to get transactions since
   * @return {Promise<Array<any>>} Array of withdrawal objects
   */
  async getTransactions(symbol?: string, since?: number): Promise<Array<any>> {
    if (this.access === "private") {
      const results = await Promise.all([
        this.getWithdrawals(symbol, "send", since),
        this.getDeposits(symbol, "receive", since),
        this.getOrders(symbol, since),
      ]);
      return _.sortBy(_.flatten(results), "timestamp");
    }
    return [];
  }

  /**
   * @description Fetch all transactions (withdrawals, deposits, and orders) for all symbols
   * @override BaseConnection.getAllTransactions
   * @param {number} since (Optional) Timestamp to get transactions since
   * @return {Array<any>} Array of withdrawal objects
   */
  async getAllTransactions(since?: number): Promise<any> {
    if (this.access === "private") {
      const catchErrors: Array<any> = [
        ccxt.NetworkError,
        ccxt.ExchangeError,
        ccxt.InvalidNonce,
      ];
      let allTransactions: Array<any> = [];
      if (this.requireSymbols) {
        for (const symbol of this.symbols) {
          let x = 0;
          while (x < 3) {
            try {
              const transactions = await this.getTransactions(symbol, since);
              allTransactions = allTransactions.concat(transactions);
              break;
            } catch (e) {
              if (catchErrors.some((error: any) => e instanceof error)) {
                if (e.message.includes("does not have currency code")) {
                  break;
                }
                await sleep(1500);
                console.log("rate limit exceed...sleeping", e.message);
                x++;
              } else {
                console.log(`getTransactions failed => ${e.message}`);
                break;
              }
            }
          }
        }
      } else {
        allTransactions = await this.getTransactions(undefined, since);
      }
      allTransactions = _.sortBy(allTransactions, "timestamp");
      return allTransactions;
    }
    return [];
  }

  /**
   * @description Get preferred market(s) to convert asset to USD (or stablecoin)
   * @param {string} symbol Currency Symbol
   * @param {Array<string>} exclude Currency Symbol
   * @return {Array<string>} Ex: ["USDC"] or ["BTC", "USD"]
   */
  getQuoteConversion(
    symbol: string,
    exclude: Array<string> = []
  ): Array<string> {
    const currencyPairs: Array<string> = this.markets.filter(
      (currencyPair: string) => {
        const [base, quote] = currencyPair.split("/");
        return base === symbol && !exclude.includes(quote);
      }
    );

    if (currencyPairs.length > 0) {
      const quoteOptions = [...this.stableCurrencies, "BTC", "ETH"];
      const quoteCurrency: string =
        quoteOptions.find((quoteSymbol: string) =>
          currencyPairs.includes(`${symbol}/${quoteSymbol}`)
        ) || "";
      if (!this.stableCurrencies.includes(quoteCurrency)) {
        return [quoteCurrency, this.quoteCurrency];
      }
      return [quoteCurrency];
    } else {
      // TODO provide fallback market data sources if no prices are found (this should be rare like if exchange delists asset or locks trading)
    }
    return [];
  }

  /**
   * @description Get price of an asset at a given time (only public access required)
   * @param {string} symbol Currency symbol
   * @param {number} timestamp Timestamp to get price at
   * @return {Promise<number>} Price of asset in USD
   */
  async getQuote(symbol: string, timestamp: number): Promise<number> {
    if (this.stableCurrencies.includes(symbol)) {
      return 1;
    }
    // Must use this loop to make sure a market is found and that market returns a valid
    // price for the provided timestamp. Consider making this a shared function
    let price: number = 0;
    let quotes: Array<string> = this.getQuoteConversion(symbol);
    let exclude: Array<string> = [];
    while (quotes.length > 0) {
      exclude = _.uniq(exclude.concat(quotes));
      const candle = await this.connection.fetchOHLCV(
        `${symbol}/${quotes[0]}`,
        "1m",
        timestamp,
        2
      );
      if (candle.length > 0) {
        price = candle[0][3];
        if (quotes.length > 1) {
          const conversionCandle = await this.connection.fetchOHLCV(
            `${quotes[0]}/${quotes[1]}`,
            "1m",
            timestamp,
            2
          );
          price = price * conversionCandle[0][3];
        }
        return price;
      } else {
        quotes = this.getQuoteConversion(symbol, exclude);
      }
    }
    return price;
  }

  /**
   * @description Get price of an asset at a given time (only public access required)
   * @param {number} timestamp Timestamp to get price at
   * @param {string} baseCurrency Base currency symbol
   * @param {string} feeCurrency (Optional) Fee currency symbol - will default to base or quote if not specifed
   * @param {string} quoteCurrency (Optional) Quote currency symbol
   * @param {number} quotePrice Price of base currency denominated in quote currency
   * @return {Promise<any>} Price of asset in USD
   */
  async getCommonPrices(
    timestamp: number,
    baseCurrency: string,
    feeCurrency?: string,
    quoteCurrency?: string,
    quotePrice?: number
  ): Promise<number> {
    const symbol: string = quoteCurrency ? quoteCurrency : baseCurrency;
    const price: number = await this.getQuote(symbol, timestamp);
    const prices: any = {};

    // Fetch fee price if neccessary
    if (feeCurrency === symbol) {
      prices.feePrice = price;
    } else if (feeCurrency) {
      if (this.stableCurrencies.includes(feeCurrency)) {
        prices.feePrice = 1;
      } else if (feeCurrency) {
        prices.feePrice = await this.getQuote(feeCurrency, timestamp);
      }
    } else {
      prices.feePrice = 0;
    }
    if (symbol === baseCurrency) {
      prices.baseUsdPrice = price;
    } else if (symbol === quoteCurrency) {
      prices.quoteUsdPrice = price;
      if (quotePrice !== undefined) {
        prices.baseUsdPrice = prices.quoteUsdPrice * quotePrice;
      }
    }
    return prices;
  }

  /**
   * @description Update USD quote values for a transaction (only public access required)
   * @param {Transaction} tx Transaction object
   * @param {any} prices Transaction prices
   * @return {Promise<Transaction>} Transaction with updated pricing data
   */
  async quoteTransaction(tx: Transaction, prices?: any): Promise<Transaction> {
    // Get and update prices
    prices = prices
      ? prices
      : await this.getCommonPrices(
          tx.timestamp.getTime(),
          tx.baseCurrency,
          tx.feeCurrency
        );
    tx.baseUsdPrice = prices.baseUsdPrice;
    tx.feePrice = prices.feePrice;

    // Update totals
    tx.feeTotal = tx.feePrice * tx.feeQuantity;
    tx.subTotal = tx.baseQuantity * tx.baseUsdPrice;
    tx.total = tx.subTotal + tx.feePrice * tx.feeQuantity;
    return tx;
  }

  /**
   * @description Update USD quote values for an order (only public access required)
   * @param {Order} order Order object
   * @param {any} prices Order prices
   * @return {Promise<Order>} Order with updated pricing data
   */
  async quoteOrder(order: Order, prices?: any): Promise<Order> {
    // Get and update prices
    prices = prices
      ? prices
      : await this.getCommonPrices(
          order.timestamp.getTime(),
          order.baseCurrency,
          order.feeCurrency,
          order.quoteCurrency,
          order.quotePrice
        );
    order.baseUsdPrice = prices.baseUsdPrice;
    order.feePrice = prices.feePrice;
    order.quoteUsdPrice = prices.quoteUsdPrice;

    // Update totals
    order.feeTotal = order.feePrice * order.feeQuantity;
    order.subTotal = order.baseQuantity * order.baseUsdPrice;
    order.total =
      order.type === "buy"
        ? order.subTotal + order.feeTotal
        : order.subTotal - order.feeTotal;
    return order;
  }
}
