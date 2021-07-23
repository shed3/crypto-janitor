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

  it("#getAllTransaction - since 03/20/2021", async () => {
    const since = new Date("2021-03-20");
    await getAllTransactionsSince(connection, since.getTime());
  });
});
