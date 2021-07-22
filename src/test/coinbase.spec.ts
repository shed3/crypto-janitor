import { describe, it, before } from "mocha";
import { Coinbase } from "../targets";
import {
  getCcxtConnectionBalance,
  getCcxtConnectionWithdrawals,
  getCcxtConnectionDeposits,
  getCcxtConnectionOrders,
  getAllTransactionsSince,
} from "./utils";

describe("Coinbase", () => {
  const creds = {
    apiKey: process.env.COINBASE_API_KEY,
    secret: process.env.COINBASE_SECRET,
  };
  const connection = new Coinbase(creds);

  before(async () => {
    await connection.initialize();
  });

  it("#getBalance", async function () {
    await getCcxtConnectionBalance(connection);
  });

  it("#getWithdrawals", async function () {
    await getCcxtConnectionWithdrawals(connection, "USD");
  });

  it("#getDeposits", async function () {
    await getCcxtConnectionDeposits(connection, "USD");
  });

  it("#getOrders", async function () {
    await getCcxtConnectionOrders(connection, "ETH");
  });

  it("#getAllTransaction - since 03/20/2021", async function () {
    const since = new Date("2021-03-20");
    await getAllTransactionsSince(connection, since.getTime());
  });
});
