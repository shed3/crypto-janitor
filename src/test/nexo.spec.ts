/* eslint-disable max-len */
import { describe, it, before } from "mocha";
import { Nexo } from "../targets";
import {
  getCcxtConnectionWithdrawals,
  getCcxtConnectionDeposits,
  getCcxtConnectionOrders,
} from "./utils";

describe.skip("Nexo", () => {
  const connection = new Nexo("nexo_transactions (5).csv");

  before(async () => {
    await connection.initialize();
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
});
