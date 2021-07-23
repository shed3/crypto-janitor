import BaseConnection from "./base";

/**
 * @description A Generic CSV Implementation of BaseConnection
 */
export default class CsvConnection extends BaseConnection {
  fileName: string;
  loadFileContents: (fileName: string) => Array<any>;
  rawTransactions: Array<any>;
  transactions: Array<any>;

  /**
   * @description Create CSV Connection instance
   * @param {string} name - Name of connection
   * @param {string} fileName - CVS file with transactions
   * @param {(fileName: string) => Array<any>} loadFileContents - Method used to load csv contents from filename
   */
  constructor(
    name: string,
    fileName: string,
    loadFileContents: (fileName: string) => Array<any>
  ) {
    super(name, "csv", { requireSymbols: false });
    this.fileName = fileName;
    this.loadFileContents = loadFileContents;
    this.transactions = [];
    this.rawTransactions = [];
  }

  /**
   * JSON object representing connection
   * @override BaseConnection.toJSON
   * @return {any}
   */
  toJSON(): any {
    const newJSON = super.toJSON();
    const updatedParams: any = newJSON.params;
    updatedParams.fileName = this.fileName;
    newJSON.params = updatedParams;
    return newJSON;
  }

  /**
   * @description Format csv transactions
   * @return {void}
   */
  _formatTransactions(): void {
    throw Error(
      `NotImplementedError: ${this.name}._formatTransactions() has not been implemented.`
    );
  }

  /**
   * @description Format csv orders
   * @return {void}
   */
  _formatOrders(): void {
    throw Error(
      `NotImplementedError: ${this.name}._formatOrders() has not been implemented.`
    );
  }

  /**
   * @description Download csv for storage bucket
   * @override BaseConnection.initialize
   * @param {boolean} forceReload - (Optional) Additional paramaters
   * @return {Promise<void>}
   */
  async initialize(forceReload: boolean = false): Promise<void> {
    if (!this.initialized || forceReload) {
      this.rawTransactions = await this.loadFileContents(this.fileName);
      this.initialized = true;
    }
  }

  /**
   * @description Filter csv connection transactions for withdrawals
   * @override BaseConnection.getWithdrawals
   * @param {string} key - Withdrawal key (default="send")
   * @return {Promise<Array<any>>} Array of withdrawal objects
   */
  async getWithdrawals(key: string = "send"): Promise<Array<any>> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.transactions.filter((x: any) => x.type === key);
  }

  /**
   * @description Filter csv connection transactions for deposits
   * @override BaseConnection.getDeposits
   * @param {string} key - Withdrawal key (default="receive")
   * @return {Promise<Array<any>>} Array of deposit objects
   */
  async getDeposits(key: string = "receive"): Promise<Array<any>> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.transactions.filter((x: any) => x.type === key);
  }

  /**
   * @description Filter csv connection transactions for buys and sells
   * @override BaseConnection.getOrders
   * @param {Array<string>} keys - Order keys (default=["buy", "sell"])
   * @return {Promise<Array<any>>} Array of order objects
   */
  async getOrders(keys: Array<string> = ["buy", "sell"]): Promise<Array<any>> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.transactions.filter((x: any) => keys.includes(x.type));
  }

  /**
   * @description Get csv connection transactions (withdrawals, deposits, and orders)
   * @override BaseConnection.getTransactions
   * @return {Promise<Array<any>>} Array of withdrawal objects
   */
  async getTransactions(): Promise<Array<any>> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.transactions;
  }

  /**
   * @description Get all csv connection transactions (withdrawals, deposits, and interest)
   * @override BaseConnection.getAllTransactions
   * @return {Promise<Array<any>>} Array of transaction objects
   */
  async getAllTransactions(): Promise<Array<any>> {
    return await this.getTransactions();
  }
}
