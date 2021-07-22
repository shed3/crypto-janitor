import { CcxtConnection } from "../target.types";

/**
 * A Bittrex Implementation of ccxtConnection
 */
export default class Bittrex extends CcxtConnection {
  accounts: any;
  /**
   * Create Bittrex instance
   * @param {any} creds - Bittrex API creds
   */
  constructor(creds: any) {
    super("bittrex", creds, {
      rateLimit: 500,
      requireSymbols: false,
      requireUsdValuation: true,
    });
  }
}
