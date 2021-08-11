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

  beforeAll(async () => {
    await connection.initialize();
  });

  it.skip("#getBalance", async () => {
    await getCcxtConnectionBalance(connection);
  });

  it.skip("#getWithdrawals", async () => {
    await getCcxtConnectionWithdrawals(connection);
  });

  it.skip("#getDeposits", async () => {
    await getCcxtConnectionDeposits(connection);
  });

  it("#getOrders", async () => {
    await getCcxtConnectionOrders(connection);
  });

  it.skip("#getAllTransaction - since 03/20/2021", async () => {
    const since = new Date("2021-03-20");
    await getAllTransactionsSince(connection, since.getTime());
  });
});
