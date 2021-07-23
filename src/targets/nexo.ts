import { CsvConnection, Transaction, Order } from "../target.types";
import * as _ from "lodash";

/**
 * A Nexo Implementation of CsvConnection
 */
export default class Nexo extends CsvConnection {
  transactionTypes: any = {
    Deposit: "receive",
    Withdrawal: "send",
    LockingTermDeposit: "stake",
    FixedTermInterest: "interest-in-stake",
    UnlockingTermDeposit: "unstake",
    TransferIn: "unpost-collateral",
    TransferOut: "post-collateral",
    WithdrawalCredit: "withdraw-loan",
  };
  symbols: Array<string> = [
    "BTC",
    "ETH",
    "LTC",
    "XRP",
    "EOS",
    "XLM",
    "BCH",
    "USDT",
    "USDC",
    "TUSD",
    "DAI",
    "PAX",
    "HUSD",
    "LINK",
    "TRX",
    "PAX",
    "Gold",
    "BNB",
  ];

  /**
   * @description Create Nexo instance
   * @param {string} fileName - CVS file with transactions
   * @param {(fileName: string) => Array<any>} loadFileContents - Method used to load csv contents from filename
   */
  constructor(fileName: string, loadFileContents: (fileName: string) => Array<any>) {
    super("nexo", fileName, loadFileContents);
  }

  /**
   * ## HELPER ##
   * @description Format transaction from raw nexo csv transaction
   * @override CsvConnection._formatTransaction
   * @param {any} transaction - Unformatted nexo transaction
   * @param {string} type - Type of transaction
   * @return {Transaction} Formatted transaction
   */
  _formatTransaction(transaction: any): Transaction {
    let type: string;
    if (transaction.Type === "Interest") {
      type = transaction.Amount > 0 ? "interest-in-account" : "interest-out-loan";
    } else {
      type = this.transactionTypes[transaction.Type];
    }
    if (type === "receive") {
      // Address not in details means it was a loan deposit
      const address = transaction.Details.split("approved / ")[1];
      type = address.length < 1 ? "receive-loan" : type;
    }
    const total: number = Math.abs(transaction["USD Equivalent"].slice(1));
    const baseQuantity = Math.abs(transaction.Amount);
    const formatted: Transaction = {
      id: transaction.Transaction,
      timestamp: new Date(transaction["Date / Time"]),
      type: type,
      baseCurrency: transaction.Currency,
      baseQuantity: baseQuantity,
      baseUsdPrice: total / baseQuantity,
      feeCurrency: "USD",
      feeQuantity: 0,
      feePrice: 1,
      feeTotal: 0,
      subTotal: total,
      total: total,
    };
    return formatted;
  }

  /**
   * ## HELPER ##
   * @description Format orders from raw nexo csv transaction
   * @override CsvConnection._formatOrder
   * @param {any} order - Unformatted nexo transaction
   * @return {Order} Formatted Order
   */
  _formatOrder(order: any): Order {
    const stableCoins = ["USD", "USDC", "USDTERC"];
    const otherQuotesCoins = ["BTC", "ETH"];

    const coins = order.Currency.split("/"); // parse coins from pair
    const amounts = order.Amount.split(" / ").map((x: string) => parseFloat(x)); // parse quantities from pair

    // set base/quote currencies and quantities
    let type: string = "buy";
    let quoteCurrency: string = coins[0];
    let quoteQuantity: number = Math.abs(amounts[0]);
    let baseCurrency: string = coins[1];
    let baseQuantity: number = amounts[1];

    // attempted to swap base and quote currencies to refelect a sell to stable, BTC, or ETH
    if (stableCoins.includes(coins[1]) || otherQuotesCoins.includes(coins[1])) {
      type = "sell";
      baseCurrency = coins[0];
      baseQuantity = amounts[0];
      quoteCurrency = coins[1];
      quoteQuantity = amounts[1];
    }

    // Correct nexo token names
    baseCurrency = baseCurrency === "USDTERC" ? "USDT" : baseCurrency;
    baseCurrency = baseCurrency === "NEXOBNB" ? "BNB" : baseCurrency;
    quoteCurrency = quoteCurrency === "USDTERC" ? "USDT" : quoteCurrency;
    quoteCurrency = quoteCurrency === "NEXOBNB" ? "BNB" : quoteCurrency;

    // Calculate USD related values
    const total: number = Math.abs(order["USD Equivalent"].slice(1));
    const quotePrice: number = quoteQuantity / baseQuantity;
    const quoteUSDPrice: number = quoteQuantity / total;
    const baseUSDPrice: number = quoteUSDPrice * quotePrice;

    // create formatted order object
    const formatted: Order = {
      id: order.Transaction,
      timestamp: new Date(order["Date / Time"]),
      type: type,
      baseCurrency: baseCurrency,
      baseQuantity: baseQuantity,
      baseUsdPrice: baseUSDPrice,
      quoteCurrency: quoteCurrency,
      quoteQuantity: quoteQuantity,
      quotePrice: quotePrice,
      quoteUsdPrice: quoteUSDPrice,
      feeCurrency: "USD",
      feeQuantity: 0,
      feePrice: 1,
      feeTotal: 0,
      subTotal: total,
      total: total,
    };
    return formatted;
  }

  /**
    * @description Download csv and clean transactions
    * @override CsvConnection.initialize
    * @param {boolean} forceReload - (Optional) Additional paramaters
    * @return {Promise<void>}
    */
  async initialize(forceReload: boolean = false): Promise<void> {
    if (!this.initialized || forceReload) {
      await super.initialize(forceReload);
      const transactions = this.rawTransactions.filter((x: any) => x.Type !== "Exchange").map((x: any) => this._formatTransaction(x));
      const orders = this.rawTransactions.filter((x: any) => x.Type === "Exchange").map((x: any) => this._formatOrder(x));
      this.transactions = _.sortBy(transactions.concat(orders), "timestamp");
      this.initialized = true;
    }
  }
}
