import { CcxtConnection } from "../target.types";

/**
 * A Coinbase Pro Implementation of ccxtConnection
 */
export default class CoinbasePro extends CcxtConnection {
    accounts: any;
    /**
     * Create Coinbase Pro instance
     * @param {any} creds - Coinbase Pro API creds
     */
    constructor(creds: any) {
        super("coinbasepro", creds, {
            rateLimit: 200,
            requireSymbols: false,
            requireUsdValuation: true,
        });
    }
}
