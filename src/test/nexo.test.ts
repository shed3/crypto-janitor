/* eslint-disable max-len */
import { Nexo } from "../targets";
import {
  getCcxtConnectionWithdrawals,
  getCcxtConnectionDeposits,
  getCcxtConnectionOrders,
} from "./utils";

describe.skip("Nexo", () => {
  const connection = new Nexo("nexo_transactions (5).csv");

  beforeAll(async () => {
    await connection.initialize();
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
});
