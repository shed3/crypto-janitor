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

  beforeAll(async () => {
    await connection.initialize();
  });

  it("#getBalance", async () => {
    await getCcxtConnectionBalance(connection);
  });

  it("#getWithdrawals", async () => {
    await getCcxtConnectionWithdrawals(connection);
  });

  it("#getDeposits", async () => {
    await getCcxtConnectionDeposits(connection);
  });

  it("#getOrders", async () => {
    await getCcxtConnectionOrders(connection);
  });

  it("#getAllTransaction - since 03/20/2021", async () => {
    const since = new Date("2021-03-20");
    await getAllTransactionsSince(connection, since.getTime());
  });
});
