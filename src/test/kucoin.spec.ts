import { describe, it, before } from "mocha";
import { Kucoin } from "../targets";
import {
  getCcxtConnectionBalance,
  getCcxtConnectionWithdrawals,
  getCcxtConnectionDeposits,
  getCcxtConnectionOrders,
  getAllTransactionsSince,
} from "./utils";

describe("Kucoin", () => {
  const creds = {
    apiKey: process.env.KUCOIN_API_KEY,
    secret: process.env.KUCOIN_SECRET,
    password: process.env.KUCOIN_PASSWORD,
  };
  const connection = new Kucoin(creds);

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
