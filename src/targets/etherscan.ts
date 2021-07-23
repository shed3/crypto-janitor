import BaseConnection, { Transaction, Order } from "../target.types/base";
import ccxtConnection from "../target.types/ccxt";
import * as _ from "lodash";
const web3 = require("web3");
const etherscan = require("etherscan-api");

/**
 * @description A Etherscan Implementation of BaseConnection
 */
export default class Etherscan extends BaseConnection {
  client: any;
  address: string;
  rawTransactions: Array<any>;
  transactions: Array<any>;
  fallbackDataSources: Array<string>;
  currentDataSource: any;
  availableDataSources: any = {
    coinbase: new ccxtConnection("coinbase"),
    coinbasepro: new ccxtConnection("coinbasepro"),
    kucoin: new ccxtConnection("kucoin"),
    bittrex: new ccxtConnection("bittrex"),
    gateio: new ccxtConnection("gateio"),
    bitstamp: new ccxtConnection("bitstamp"),
    ftx: new ccxtConnection("ftx"),
    hitbtc: new ccxtConnection("hitbtc"),
    huobipro: new ccxtConnection("huobipro"),
    kraken: new ccxtConnection("kraken"),
    okcoin: new ccxtConnection("okcoin"),
    poloniex: new ccxtConnection("poloniex"),
    yobit: new ccxtConnection("yobit"),
  };

  /**
   * @description Create Ledger instance
   * @param {string} address - CVS file with transactions
   * @param {string} marketDataSource - Name of implmented
   */
  constructor(address: string, apiKey: string, marketDataSource?: string) {
    super("etherscan", "address", { requireSymbols: false });
    this.address = address;
    this.transactions = [];
    this.rawTransactions = [];
    this.fallbackDataSources = Object.keys(this.availableDataSources);
    this.currentDataSource = new ccxtConnection(
      marketDataSource ? marketDataSource : this.fallbackDataSources[0]
    );
    this.client = etherscan.init(apiKey);
  }

  /**
   * @description JSON object representing connection
   * @override BaseConnection.toJSON
   * @return {any}
   */
  toJSON(): any {
    const newJSON = super.toJSON();
    const updatedParams: any = newJSON.params;
    updatedParams.address = this.address;
    updatedParams.chain = "ethereum";
    newJSON.params = updatedParams;
    newJSON.name = `Ethereum Address (
      ${this.address.slice(0, 6)}...${this.address.slice(-4)})`;
    return newJSON;
  }

  /**
   * HELPER
   * @description Parse out transactions and order from ledger entry group
   * @param {string} symbol - Currency symbol
   * @param {Array<string>} exclude - An array of connection names to exclude from the check
   * @return {any} Market data source (ccxt public connection)
   */
  async findMarketForQuote(symbol: string, exclude: Array<string> = []) {
    const attempted: Array<string> = [];

    // check if the currentDataSource is excluded
    if (!exclude.includes(this.currentDataSource.name)) {
      attempted.push(this.currentDataSource.name);
      if (this.currentDataSource.getQuoteConversion(symbol).length > 0) {
        // currentDataSource has a market for desired symbol
        return { dataSource: this.currentDataSource, attempted };
      }
      exclude.push(this.currentDataSource.name);
    }

    const fallbacks: Array<string> = this.fallbackDataSources.filter(
      (src: string) => !exclude.includes(src)
    );
    for (let x = 0; x < fallbacks.length; x++) {
      attempted.push(fallbacks[x]);
      await this.availableDataSources[fallbacks[x]].initialize();
      if (
        this.availableDataSources[fallbacks[x]].getQuoteConversion(symbol)
          .length > 0
      ) {
        return {
          dataSource: this.availableDataSources[fallbacks[x]],
          attempted,
        };
      } else {
        console.log(
          `MARKET NOT FOUND: Could not find ${symbol} on ${fallbacks[x]}.`
        );
      }
    }
    return { dataSource: null, attempted };
  }

  /**
   * HELPER
   * @description Parse out transactions and order from ledger entry group
   * @param {any} entryGroup - Unformatted ledger transaction
   * @return {Promise<Transaction | Order>} Formatted transaction
   */
  async _parseEntryGroup(entryGroup: any): Promise<Transaction | Order> {
    const quoteCoins = ["USD", "USDC", "USDT", "BTC"];
    entryGroup.map((x: any) => {
      x.from = web3.utils.toChecksumAddress(x.from);
      x.to = web3.utils.toChecksumAddress(x.to);
      return x;
    });
    const formattedTx: any = {
      id: entryGroup[0].hash,
      timestamp: new Date(entryGroup[0].timeStamp * 1000),
      type: "",
      baseCurrency: "",
      baseQuantity: 0,
      baseUsdPrice: 0,
      feeCurrency: "ETH",
      feeQuantity:
        web3.utils.toBN(entryGroup[0].gasUsed) *
        web3.utils.fromWei(entryGroup[0].gasPrice),
      feePrice: 0,
      feeTotal: 0,
      subTotal: 0,
      total: 0,
    };
    if (entryGroup.length === 1) {
      const tx = entryGroup[0];
      const value: number = parseInt(tx.value) * 1;
      if (value === 0) {
        // Transaction that approves dapp to use this.address
        formattedTx.type = "send";
        formattedTx.baseCurrency = "ETH";
        formattedTx.baseQuantity = 0;
      } else if (value > 0) {
        // Could be sending/receiving eth or receiving a token
        formattedTx.type = tx.from === this.address ? "send" : "receive";
        formattedTx.feeCurrency =
          formattedTx.type === "receive" ? "USD" : formattedTx.feeCurrency;
        formattedTx.feeQuantity =
          formattedTx.type === "receive" ? 0 : formattedTx.feeQuantity;
        formattedTx.baseCurrency = tx.hasOwnProperty("tokenSymbol")
          ? tx.tokenSymbol
          : "ETH";
        formattedTx.baseQuantity =
          web3.utils.fromWei(
            tx.value,
            tx.tokenDecimal === "6" ? "picoether" : "ether"
          ) * 1;
      }
    } else if (entryGroup.length === 2) {
      // Could be buying/selling token using eth or
      // sending a token and paying gas fees using eth
      let tokenTx: any = entryGroup[0];
      let ethTx: any = entryGroup[1];
      if (!tokenTx.hasOwnProperty("tokenSymbol")) {
        tokenTx = entryGroup[1];
        ethTx = entryGroup[0];
      }
      formattedTx.baseCurrency = tokenTx.tokenSymbol;
      formattedTx.baseQuantity =
        web3.utils.fromWei(
          tokenTx.value,
          tokenTx.tokenDecimal === "6" ? "picoether" : "ether"
        ) * 1;
      if (ethTx.value > 0) {
        // buy or sell token with eth
        formattedTx.type = ethTx.from === this.address ? "buy" : "sell";
        formattedTx.quoteCurrency = "ETH";
        formattedTx.quoteQuantity = web3.utils.fromWei(ethTx.value) * 1;
        formattedTx.quotePrice =
          formattedTx.quoteQuantity / formattedTx.baseQuantity;
      } else {
        // send token and pay gas with eth or claim airdrop token
        formattedTx.type = tokenTx.to === this.address ? "receive" : "send";
      }
      formattedTx.quoteUsdPrice = 0;
    } else if (entryGroup.length === 3) {
      // buy/sell token using another token with high
      // volume liquidity pool converter (Ex: WBTC, WETH, etc)
      const tokens: any = entryGroup.filter((x: any) => x.tokenSymbol);
      const tokenFromTx: any =
        tokens[1].from === this.address ? tokens[1] : tokens[0];
      const tokenToTx: any =
        tokens[0].to === this.address ? tokens[0] : tokens[1];
      formattedTx.type = "buy";
      formattedTx.baseCurrency = tokenToTx.tokenSymbol;
      formattedTx.baseQuantity =
        web3.utils.fromWei(
          tokenToTx.value,
          tokenToTx.tokenDecimal === "6" ? "picoether" : "ether"
        ) * 1;
      formattedTx.quoteCurrency = tokenFromTx.tokenSymbol;
      formattedTx.quoteQuantity =
        web3.utils.fromWei(
          tokenFromTx.value,
          tokenFromTx.tokenDecimal === "6" ? "picoether" : "ether"
        ) * 1;
      // attempted to swap base and quote currencies to refelect a sell to stablecoin or BTC
      if (quoteCoins.includes(tokenToTx.tokenSymbol)) {
        formattedTx.type = "sell";
        const tempCurrency = formattedTx.baseCurrency;
        const tempQuantity = formattedTx.baseQuantity;
        formattedTx.baseCurrency = formattedTx.quoteCurrency;
        formattedTx.baseQuantity = formattedTx.quoteQuantity;
        formattedTx.quoteCurrency = tempCurrency;
        formattedTx.quoteQuantity = tempQuantity;
      }
      formattedTx.quotePrice =
        formattedTx.quoteQuantity / formattedTx.baseQuantity;
    } else {
      console.log(
        `UNPARSABLE TX: Received tx group with ${entryGroup.length}`,
        entryGroup
      );
    }
    if (formattedTx.type === "buy" || formattedTx.type === "sell") {
      // Quote currencies should almost always (fingers crossed) exist on
      // any market so no need to check for existing price data.
      const market: any = await this.findMarketForQuote(
        formattedTx.quoteCurrency
      );
      const result: Order = await market.dataSource.quoteOrder(
        formattedTx as Order
      );
      return result;
    } else {
      // Must use this loop to make sure a market is found and that market returns a valid
      // price for the provided timestamp. Once a valid market and price are found apply the
      // prices to the transaction
      let market: any = await this.findMarketForQuote(formattedTx.baseCurrency);
      let attempted: Array<any> = [];
      while (market.attempted.length < this.fallbackDataSources.length) {
        attempted = _.uniq(attempted.concat(market.attempted));
        if (market.dataSource) {
          const prices: any = await market.dataSource.getCommonPrices(
            formattedTx.timestamp,
            formattedTx.baseCurrency,
            formattedTx.feeCurrency
          );
          if (prices.baseUsdPrice) {
            const result: Transaction =
              await market.dataSource.quoteTransaction(
                formattedTx as Transaction,
                prices
              );
            return result;
          }
          market = await this.findMarketForQuote(
            formattedTx.baseCurrency,
            attempted
          );
        }
      }
    }
    // only get here if no market is found for a transaction's baseCurrency (hopefully its rare)
    return formattedTx;
  }

  /**
   * @description Fetch and clean transactions
   * @override BaseConnection.initialize
   * @param {boolean} forceReload - (Optional) Additional paramaters
   * @return {Promise<void>}
   */
  async initialize(forceReload: boolean = false): Promise<void> {
    if (!this.initialized || forceReload) {
      await this.currentDataSource.initialize();
      const transactions = await Promise.all([
        this.client.account.txlist(this.address, 1, "latest", 1, 100, "asc"),
        this.client.account.tokentx(
          this.address,
          "",
          1,
          "latest",
          1,
          100,
          "asc"
        ),
      ]);
      this.rawTransactions = Object.values(
        _.groupBy(_.flatten(transactions.map((x: any) => x.result)), "hash")
      );
      this.initialized = true;
    }
  }

  /**
   * Fetch Account transactions by type, symbol, and/or since a certain time
   * @param {string | Array<string>} type (Optional) Transaction type(s)
   * @param {number} since (Optional) Timestamp to get transactions since
   * @return {Promise<Array<any>>} Array of deposit objects
   */
  async filterTransactions(
    type?: string | Array<string>,
    since?: number
  ): Promise<Array<any>> {
    if (this.transactions.length < 1) {
      const cleanedTxs = this.rawTransactions.map(
        async (x: any) => await this._parseEntryGroup(x)
      );
      this.transactions = await Promise.all(cleanedTxs);
      this.transactions = _.sortBy(this.transactions, "timestamp");
      // await this.initialize();
    }
    let filteredTransactions: Array<Transaction> = this.transactions;
    if (type) {
      if (typeof type === "string") {
        filteredTransactions = filteredTransactions.filter(
          (transaction: Transaction) => transaction.type === type
        );
      } else if (Array.isArray(type)) {
        filteredTransactions = filteredTransactions.filter(
          (transaction: Transaction) => type.includes(transaction.type)
        );
      }
    }
    if (since) {
      filteredTransactions = filteredTransactions.filter(
        (transaction: Transaction) => transaction.timestamp.getTime() > since
      );
    }
    return filteredTransactions;
  }

  /**
   * @description Filter for address withdrawals
   * @override BaseConnection.getWithdrawals
   * @param {number} since (Optional) Timestamp to get transactions since
   * @return {Promise<Array<any>>} Array of withdrawal objects
   */
  async getWithdrawals(since?: number): Promise<Array<any>> {
    return await this.filterTransactions("send", since);
  }

  /**
   * @description Filter for address deposits
   * @override BaseConnection.getDeposits
   * @param {number} since (Optional) Timestamp to get transactions since
   * @return {Promise<Array<any>>} Array of deposit objects
   */
  async getDeposits(since?: number): Promise<Array<any>> {
    return await this.filterTransactions("receive", since);
  }

  /**
   * @description Filter for address orders
   * @override BaseConnection.getOrders
   * @param {number} since (Optional) Timestamp to get transactions since
   * @return {Promise<Array<any>>} Array of deposit objects
   */
  async getOrders(since?: number): Promise<Array<any>> {
    return await this.filterTransactions(["buy", "sell"], since);
  }

  /**
   * @description Get address transactions (withdrawals, deposits, and orders)
   * @override BaseConnection.getTransactions
   * @param {number} since (Optional) Timestamp to get transactions since
   * @return {Promise<Array<any>>} Array of withdrawal objects
   */
  async getTransactions(since?: number): Promise<Array<any>> {
    return await this.filterTransactions(undefined, since);
  }

  /**
   * @description Get all address transactions (withdrawals, deposits, and interest)
   * @override BaseConnection.getAllTransactions
   * @param {number} since (Optional) Timestamp to get transactions since
   * @return {Promise<Array<any>>} Array of transaction objects
   */
  async getAllTransactions(since?: number): Promise<Array<any>> {
    return await this.filterTransactions(undefined, since);
  }
}
