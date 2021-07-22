import { describe, it, before } from "mocha";
import { Celsius } from "../targets";
import {
  getCcxtConnectionBalance,
  getCcxtConnectionWithdrawals,
  getCcxtConnectionDeposits,
  getAllTransactionsSince,
} from "./utils";

describe("Celsius", () => {
  const creds = {
    apiKey: process.env.CELSIUS_API_KEY,
    partnerKey: process.env.CELSIUS_PARTNER_KEY,
  };
  const connection = new Celsius(creds);

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

  it("#getAllTransaction - since 03/20/2021", async function () {
    const since = new Date("2021-03-20");
    await getAllTransactionsSince(connection, since.getTime());
  });
});
