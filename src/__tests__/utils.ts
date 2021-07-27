import { Transaction, Order } from "../target.types";
import { expect } from "chai";


export const checkTxFields = (tx: Transaction) => {
  if (!tx.baseUsdPrice) {
    console.log(tx);
  }
  expect(tx).to.include.all.keys("id", "timestamp", "type", "baseCurrency", "baseQuantity", "baseUsdPrice", "feeCurrency", "feeQuantity", "feePrice", "feeTotal", "subTotal", "total");
  expect(tx.id, "id field blank").to.be.not.be.empty;
  expect(tx.baseCurrency, `(${tx.id}) "baseCurrency" field blank.`).to.be.not.be.empty;
  expect(tx.baseUsdPrice !== 0, `(${tx.id}) "baseUsdPrice" field blank.`).to.be.true;
  expect(tx.total !== 0, `(${tx.id}) "total" field blank.`).to.be.true;
};

export const checkOrderFields = (order: Order) => {
  expect(order).to.include.all.keys("id", "timestamp", "type", "baseCurrency", "baseQuantity", "baseUsdPrice", "quoteCurrency", "quoteQuantity", "quotePrice", "quoteUsdPrice", "feeCurrency", "feeQuantity", "feePrice", "feeTotal", "subTotal", "total");
  expect(order.id, "id field blank").to.be.not.be.empty;
  expect(order.baseCurrency, `(${order.id}) "baseCurrency" field blank.`).to.be.not.be.empty;
  expect(order.quoteCurrency, `(${JSON.stringify(order)}) "quoteCurrency" field blank.`).to.be.not.be.empty;
  expect(order.feeCurrency, `(${order.id}) "feeCurrency" field blank.`).to.be.not.be.empty;
  expect(order.baseUsdPrice !== 0, `(${order.id}) "baseUsdPrice" field blank.`).to.be.true;
  expect(order.quoteUsdPrice !== 0, `(${order.id}) "quoteUsdPrice" field blank.`).to.be.true;
  expect(order.subTotal !== 0, `(${order.id}) "subTotal" field blank.`).to.be.true;
  expect(order.total !== 0, `(${order.id}) "total" field blank.`).to.be.true;
  expect(order.type === "buy" || order.type === "sell", "type is neither buy or sell").to.be.true;
};

export const getCcxtConnectionBalance = async (connection: any) => {
  const result = await connection.getBalances();
  expect(result).to.be.an("object");
  expect(result).to.include.all.keys("total", "free", "used");
  expect(Object.values(result.used).some((x) => isNaN(x as any)), "value(s) in balance.used are not numbers").to.be.false;
  expect(Object.values(result.free).some((x) => isNaN(x as any)), "value(s) in balance.free are not numbers").to.be.false;
  expect(Object.values(result.total).some((x) => isNaN(x as any)), "value(s) in balance.total are not numbers").to.be.false;
};

export const getCcxtConnectionWithdrawals = async (connection: any, symbol?: string) => {
  const result = await connection.getWithdrawals(symbol);
  expect(result).to.be.an("array").that.is.not.empty;
  result.forEach((tx: any) => checkTxFields(tx as Transaction));
};

export const getCcxtConnectionDeposits = async (connection: any, symbol?: string) => {
  const result = await connection.getDeposits(symbol);
  expect(result).to.be.an("array").that.is.not.empty;
  result.forEach((tx: any) => checkTxFields(tx as Transaction));
};

export const getCcxtConnectionOrders = async (connection: any, symbol?: string) => {
  const result = await connection.getOrders(symbol);
  expect(result).to.be.an("array").that.is.not.empty;
  result.forEach((order: any) => checkOrderFields(order as Order));
};

export const getAllTransactionsSince = async (connection: any, since: number) => {
  const result = await connection.getAllTransactions(since);
  expect(result).to.be.an("array").that.is.not.empty;
  expect(result[0].timestamp.getTime()).to.be.greaterThan(since);
};
