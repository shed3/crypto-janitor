/* eslint-disable max-len */
import { CcxtConnection, Transaction } from "../target.types";
import * as _ from "lodash";

/**
 * A Coinbase Implementation of ccxtConnection
 * @todo Properly parse ledger transaction and merge them with others
 */
export default class Coinbase extends CcxtConnection {
    accounts: any;
    /**
     * @description Create Coinbase instance
     * @param {any} creds - API creds of exchange
     */
    constructor(creds: any) {
        super("coinbase", creds, {
            rateLimit: 100,
            requireSymbols: true,
            requireUsdValuation: false,
        });
    }

    /**
     * @description Get corresponding coinbase account ID from symbol
     * @param {string} symbol - Currency symbol
     * @return {string}  Account ID
     */
    _getAccountIdFromSymbol(symbol: string): string {
        const matches: Array<any> = this.accounts.filter(
            (x: any) => x.currency.code === symbol
        );
        const accountId: string = matches[0].id;
        return accountId;
    }

    /**
     * @description Format orders
     * @param {any} entry - Unformatted coinbase transaction
     * @param {string} type - Type of transaction
     * @return {Transaction} Formatted transaction
     */
    _formatLedgerEntry(entry: any, type: string): Transaction {
        const fee: number =
            entry.network && entry.network.transaction_fee
                ? parseFloat(entry.network.transaction_fee.amount)
                : 0;
        const feeCurrency: string =
            fee > 0 ? entry.network.transaction_fee.currency : "USD";
        const nativeTotal: number = Math.abs(
            parseFloat(entry.native_amount.amount)
        );
        let total: number = Math.abs(parseFloat(entry.amount.amount));
        total = entry.amount.currency === feeCurrency ? total - fee : total;
        const price: number = nativeTotal / total;
        const feePrice: number = fee * price;
        const subTotal: number = nativeTotal - fee * price;
        const formatted: Transaction = {
            id: entry.id,
            timestamp: new Date(entry.created_at),
            type: type,
            baseCurrency: entry.amount.currency,
            baseQuantity: total,
            baseUsdPrice: subTotal / total,
            feeCurrency: fee ? entry.network.transaction_fee.currency : "USD",
            feeQuantity: fee,
            feePrice: feePrice,
            feeTotal: feePrice * fee,
            subTotal: subTotal,
            total: nativeTotal,
        };
        return formatted;
    }

    /**
     * @description Initialize coinbase and get active accounts
     * @override ccxtConnection.initialize
     * @param {boolean} forceReload - (Optional) Additional paramaters
     * @return {Promise<void>}
     */
    async initialize(forceReload: boolean = false): Promise<void> {
        await super.initialize(forceReload);
        this.accounts = this.balances.info.data.filter(
            (account: any) => account.created_at !== account.updated_at
        ); // active account if created_at and updated_at dont match
        this.symbols = this.accounts.map((x: any) => x.currency.code);
    }

    /**
     * @description Fetch all account transactions (withdrawals, deposits, and orders)
     * @todo Paginate requests rather than just set max limit of 100
     * @override ccxtConnection.getLedger
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
        const excludeTypes = ["buy", "sell", "fiat_deposit", "fiat_withdrawal"];
        const ledger = await super.getLedger(symbol, since, limit);
        const rawEntries = ledger
            .map((x: any) => x.info)
            .filter((x: any) => !excludeTypes.includes(x.type));
        const parsedEntries = rawEntries.map((entry: any) => {
            if (entry.type === "staking-reward") {
                return this._formatLedgerEntry(entry, "interest-in-stake"); // staking interest
            } else if (entry.type === "interest") {
                return this._formatLedgerEntry(entry, "interest-in-account"); // account interest
            } else if (
                entry.hasOwnProperty("from") &&
                entry.type === "send" &&
                entry.network.status === "off_blockchain"
            ) {
                return this._formatLedgerEntry(entry, "reward"); // reward from coinbase earn
            } else if (
                entry.hasOwnProperty("to") ||
                entry.type === "pro_deposit"
            ) {
                return this._formatLedgerEntry(entry, "send"); // crypto was sent
            } else if (
                entry.hasOwnProperty("from") ||
                entry.type === "pro_withdrawal"
            ) {
                return this._formatLedgerEntry(entry, "receive"); // crypto was received
            } else if (entry.type === "exchange_deposit") {
                return this._formatLedgerEntry(entry, "withdrawal"); // crypto was withdrawn
            } else if (entry.type === "exchange_withdrawal") {
                return this._formatLedgerEntry(entry, "deposit"); // crypto was deposited
            } else {
                console.log(entry.type, entry.created_at);
            }
            return null;
        });
        return parsedEntries;
    }

    /**
     * @description Fetch Coinbase Orders
     * @override ccxtConnection.getOrders
     * @param {string} symbol Currency symbol
     * @param {number} since (Optional) Timestamp to get transactions since
     * @return {Array<any>} Array of order objects
     */
    async getOrders(symbol: string, since?: number): Promise<Array<any>> {
        const accountId = this._getAccountIdFromSymbol(symbol);
        let trades: Array<any> = await Promise.all([
            this.connection.fetchMyBuys(symbol, since, undefined, {
                accountId,
            }),
            this.connection.fetchMySells(symbol, since, undefined, {
                accountId,
            }),
        ]);
        trades = _.flatten(trades);
        return trades.map((trade: any) => this._formatOrder(trade));
    }

    /**
     * @description Fetch Fetch Coinbase transactions
     * @override ccxtConnection.getTransactions
     * @param {string} symbol Currency symbol
     * @param {number} since (Optional) Timestamp to get transactions since
     * @return {any} Transactions object
     */
    async getTransactions(symbol: string, since?: number): Promise<any> {
        const reqs = [
            this.getOrders(symbol, since),
            this.getLedger(symbol, since),
        ];
        if (symbol === "USD") {
            //  only get withdrawals and deposits for fiat
            reqs.push(this.getWithdrawals(symbol, "withdrawal", since));
            reqs.push(this.getDeposits(symbol, "deposit", since));
        }
        let results = await Promise.all(reqs);
        results = _.flatten(results);
        return _.sortBy(results, "timestamp");
    }
}
