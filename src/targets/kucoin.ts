import { CcxtConnection, Transaction } from "../target.types";
import * as _ from "lodash";

/**
 * A Kucoin Implementation of ccxtConnection
 */
export default class Kucoin extends CcxtConnection {
  /**
   * @description Create Kucoin instance
   * @param {any} creds - Kucoin API creds
   */
  constructor(creds: any) {
    super("kucoin", creds, { requireSymbols: false });
    this.quoteCurrency = "USDT";
  }

  /**
   * HELPER: Format transaction
   *
   * @override ccxtConnection._formatTransaction
   * @param {any} transaction - Unformatted cctx unified transaction
   * @param {string} forceType - Override tx type
   * @return {Transaction} Formatted transaction
   */
  _formatTransaction(transaction: any, forceType?: string): Transaction {
    const formattedTx: Transaction = super._formatTransaction(transaction, forceType);
    formattedTx.id = formattedTx.type !== "receive" ? formattedTx.id : transaction.info.walletTxId;
    return formattedTx;
  }

  /**
   * @description Fetch kucoin account orders
   * @override ccxtConnection.getOrders
   * @param {string} symbol Currency symbol (will always be undefined)
   * @param {number} since (Optional) Timestamp to get transactions since
   * @return {Array<any>} Array of withdrawal objects
   */
  async getOrders(symbol?: string, since?: number): Promise<any> {
    const allTransactions: Array<any> = [];
    const now: number = this.connection.milliseconds();
    let fetchTime: number = since ? since : this.connection.parse8601("2021-01-01T00:00:00Z");
    while (fetchTime <= now) {
      try {
        const trades = super.getOrders(symbol, fetchTime, 200);
        allTransactions.push(trades);
        fetchTime = fetchTime + 604800000;
      } catch (e) {
        console.log(e.message);
        break;
      }
    }
    let results = await Promise.all(allTransactions);
    results = _.sortBy(_.flatten(results), "timestamp");
    return results;
  }
}
