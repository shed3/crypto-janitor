require('dotenv').config()

import {
  BaseConnection,
  CcxtConnection,
  CsvConnection,
} from "./target.types";

import {
  Bittrex,
  Celsius,
  Coinbase,
  CoinbasePro,
  Etherscan,
  Kucoin,
  Nexo,
} from "./targets";

export {
  Bittrex,
  Celsius,
  Coinbase,
  CoinbasePro,
  Etherscan,
  Kucoin,
  Nexo,
  BaseConnection,
  CcxtConnection,
  CsvConnection,
};

/**
 * @description Return initialized connection instance
 * @param {string} name - Name of exchange
 * @param {string} type - Type of connection
 * @param {any} params - Params for connection instance
 * @return {Promise<any>} response of test
 */
export const resolveConnection = async (
  name: string,
  type: string,
  params: any
): Promise<any> => {
  if (name === undefined) {
    return { error: "Must specify the name of the connection." };
  }
  if (type === undefined) {
    return { error: "Must specify the type of the connection." };
  }
  let connection: any = null;
  if (type === "api") {
    if (params.credentials === undefined) {
      return { error: `Must supply 'credentials' for ${name} in params` };
    }
    switch (name) {
      case "bittrex":
        connection = new Bittrex(params.credentials);
        break;
      case "celsius":
        connection = new Celsius(params.credentials);
        break;
      case "coinbase":
        connection = new Coinbase(params.credentials);
        break;
      case "coinbasepro":
        connection = new CoinbasePro(params.credentials);
        break;
      case "kucoin":
        connection = new Kucoin(params.credentials);
        break;
      default:
        break;
    }
    if (connection === null) {
      return { error: `Connecting to ${name} via API is not yet supported.` };
    }
  } else if (type === "address") {
    if (params.address === undefined) {
      return { error: "Must supply address for ledger connection in params" };
    }
    if (params.chain === undefined) {
      return { error: "Must supply 'chain' for ledger connection in params" };
    }
    switch (params.chain) {
      case "ethereum":
        const partnerKey: string = process.env.CELSIUS_PARTNER_KEY || "";
        connection = new Etherscan(params.address, partnerKey);
        break;
      default:
        break;
    }
    if (connection === null) {
      return { error: `Connecting to ${params.chain} via ledger is not yet supported.` };
    }
  } else if (type === "csv") {
    if (params.fileName === undefined) {
      return { error: "Must supply 'fileName' for csv connection in params" };
    }
    switch (name) {
      case "nexo":
        connection = new Nexo(params.fileName);
        break;
      default:
        break;
    }
    if (connection === null) {
      return { error: `Connecting to ${name} via CSV is not yet supported.` };
    }
  } else {
    return { error: `Connecting with ${type} is not yet supported.` };
  }
  try {
    await connection.initialize();
    return { status: "success", connection };
  } catch (error) {
    return { status: "failure", error: error.message };
  }
};
