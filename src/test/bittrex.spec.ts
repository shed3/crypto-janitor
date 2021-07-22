import { describe, it, before } from "mocha";
import { Bittrex } from "../targets";
import {
  getCcxtConnectionBalance,
  getCcxtConnectionWithdrawals,
  getCcxtConnectionDeposits,
  getCcxtConnectionOrders,
  getAllTransactionsSince,
} from "./utils";

describe("Bittrex", () => {
  const creds = {
    apiKey: process.env.BITTREX_API_KEY,
    secret: process.env.BITTREX_SECRET,
  };
  const connection = new Bittrex(creds);

  before(async () => {
    await connection.initialize();
  });

  it("#getBalance", async function () {
    await getCcxtConnectionBalance(connection);
  });

  it("#getWithdrawals", async function () {
    await getCcxtConnectionWithdrawals(connection);
  });

  it("#getDeposits", async function () {
    await getCcxtConnectionDeposits(connection);
  });

  it("#getOrders", async function () {
    await getCcxtConnectionOrders(connection);
  });

  it("#getAllTransaction - since 03/20/2021", async function () {
    const since = new Date("2021-03-20");
    await getAllTransactionsSince(connection, since.getTime());
  });
});
