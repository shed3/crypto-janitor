import { BaseConnection, Transaction } from "../target.types";
import { Celsius as celsius, AUTH_METHODS, ENVIRONMENT } from "celsius-sdk";
import * as _ from "lodash";
import { sleep } from "../utils";

/**
 * A Celsius Implementation of BaseConnection
 */
export default class CelsiusConnection extends BaseConnection {
    transactions: Array<any>;
    transactionTypes: any = {
        deposit: "receive",
        withdrawal: "send",
        outbound_transfer: "send",
        interest: "interest-in-account",
        referrer_award: "reward",
        bonus_token: "reward",
    };

    /**
     * Create Celsius instance
     * @param {any} credentials - Celsius API credentials
     */
    constructor(credentials: any) {
        super("celsius", "api", { requireSymbols: false });
        this.credentials = credentials;
        this.transactions = [];
    }

    /**
     * HELPER: Format orders
     *
     * @param {any} entry - Unformatted coinbase transaction
     * @param {string} type - Type of transaction
     * @return {Transaction} Formatted transaction
     */
    _formatTransaction(entry: any): Transaction {
        const nativeTotal: number = Math.abs(parseFloat(entry.amount));
        const total: number = Math.abs(parseFloat(entry.amount_usd));
        const formatted: Transaction = {
            id: entry.id,
            timestamp: new Date(entry.time),
            type: this.transactionTypes[entry.nature],
            baseCurrency: entry.coin,
            baseQuantity: nativeTotal,
            baseUsdPrice: total / nativeTotal,
            feeCurrency: "USD",
            feeQuantity: 0,
            feeUsdPrice: 0,
            feeTotal: 0,
            subTotal: total,
            total: total,
        };
        return formatted;
    }

    /**
     * Initialize coinbase and get active accounts
     * @override BaseExchange.initialize
     * @param {boolean} forceReload - (Optional) Additional paramaters
     * @return {Promise<void>}
     */
    async initialize(forceReload: boolean = false): Promise<void> {
        this.connection = await celsius({
            authMethod: AUTH_METHODS.API_KEY,
            partnerKey: this.credentials.partnerKey,
            environment: ENVIRONMENT.PRODUCTION, // does not work in staging
        });
        this.balances = await this.getBalances();
        this.symbols = Object.keys(this.balances);
    }

    /**
     * Fetch Account Balances
     * @override BaseExchange.getBalances
     * @param {boolean} forceReload - (Optional) Additional paramaters
     * @return {Promise<any>} Account balance object
     */
    async getBalances(): Promise<any> {
        const balances: any = await this.connection.getBalanceSummary(
            this.credentials.apiKey
        );
        const totals: any = {};
        Object.entries(balances.balance).forEach(([key, val]) => {
            key = key === "usdt erc20" ? "usdt" : key;
            totals[key] = parseFloat(val as string);
        });
        const used: any = {};
        Object.keys(totals).forEach((key) => {
            used[key] = 0;
        });
        return {
            used: used,
            free: totals,
            total: totals,
        };
    }

    /**
     * Fetch Account transactions by type, symbol, and/or since a certain time
     * @param {string} type (Optional) Transaction type
     * @param {string} symbol (Optional) Currency symbol
     * @param {number} since (Optional) Timestamp to get transactions since
     * @return {Promise<Array<any>>} Array of deposit objects
     */
    async filterTransactions(
        type?: string,
        symbol?: string,
        since?: number
    ): Promise<Array<any>> {
        let transactions: Array<Transaction> = [];
        if (this.transactions.length > 0) {
            transactions = this.transactions;
        } else {
            transactions = await this.getTransactions();
        }
        let filteredTransactions: Array<Transaction> = transactions;
        if (type) {
            filteredTransactions = filteredTransactions.filter(
                (transaction: Transaction) => transaction.type === type
            );
        }
        if (symbol) {
            filteredTransactions = filteredTransactions.filter(
                (transaction: Transaction) =>
                    transaction.baseCurrency === symbol
            );
        }
        if (since) {
            filteredTransactions = filteredTransactions.filter(
                (transaction: Transaction) =>
                    transaction.timestamp.getTime() > since
            );
        }
        return filteredTransactions;
    }

    /**
     * Fetch Account Withdrawals
     * @param {string} symbol Currency symbol
     * @param {number} since (Optional) Timestamp to get transactions since
     * @param {number} limit (Optional) Max number of entries per request
     * @return {Promise<Array<any>>} Array of withdrawal objects
     */
    async getWithdrawals(symbol?: string, since?: number): Promise<Array<any>> {
        return await this.filterTransactions("send", symbol, since);
    }

    /**
     * Fetch Account Deposits
     * @param {string} symbol (Optional) Currency symbol
     * @param {number} since (Optional) Timestamp to get transactions since
     * @return {Promise<Array<any>>} Array of deposit objects
     */
    async getDeposits(symbol?: string, since?: number): Promise<Array<any>> {
        return await this.filterTransactions("receive", symbol, since);
    }

    /**
     * Fetch account transactions (withdrawals, deposits, and orders)
     * @param {string} symbol Currency symbol
     * @param {number} since (Optional) Timestamp to get transactions since
     * @return {Array<any>} Array of withdrawal objects
     */
    async getTransactions(symbol?: string, since?: number): Promise<any> {
        const initialPage = await this.connection.getTransactionSummary(
            { page: 1, perPage: 20 },
            this.credentials.apiKey
        );
        const numPages: number = initialPage.pagination.pages;
        const allPages = [];
        for (let i = 2; i <= numPages; i++) {
            allPages.push(this._getTxPage(i));
        }
        let results = await Promise.all(allPages);
        results = results.map((x: any) => x.record);
        results = _.flatten(initialPage.record.concat(results));
        results = results.filter((x: any) => x.state == "confirmed");
        results = results.map((x: any) => this._formatTransaction(x));
        results = _.sortBy(results, "timestamp");
        this.transactions = results;

        let filteredTransactions: Array<any> = results;
        if (symbol) {
            filteredTransactions = filteredTransactions.filter(
                (transaction: any) => transaction.baseCurrency === symbol
            );
        }
        if (since) {
            filteredTransactions = filteredTransactions.filter(
                (transaction: any) => transaction.timestamp.getTime() > since
            );
        }
        return filteredTransactions;
    }

    /**
     * Fetch alll celsius transactions (withdrawals, deposits, and interest)
     * @param {number} since (Optional) Timestamp to get transactions since
     * @return {Array<any>} Array of transaction objects
     */
    async getAllTransactions(since?: number): Promise<any> {
        return await this.filterTransactions(undefined, undefined, since);
    }

    /**
     * Helper function to fetch Celsius transaction page
     * @param {number} pageNum  Page number to fetch
     * @return {Array<any>} Array of transaction objects
     */
    async _getTxPage(pageNum: number): Promise<any> {
        let attempts = 0;
        let page = { record: [] };
        while (attempts < 5) {
            try {
                page = await this.connection.getTransactionSummary(
                    { page: pageNum, perPage: 20 },
                    this.credentials.apiKey
                );
                break;
            } catch (e) {
                await sleep(1000);
                attempts++;
            }
        }
        return page;
    }
}
