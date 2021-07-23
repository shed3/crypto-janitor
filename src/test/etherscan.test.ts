import { Etherscan } from "../targets";
import {
  getCcxtConnectionWithdrawals,
  getCcxtConnectionDeposits,
  getCcxtConnectionOrders,
  getAllTransactionsSince,
} from "./utils";

describe("Etherscan", () => {
  // TODO throw error if env values dont exist (maybe for all tests)
  const address: string = process.env.METAMASK_TEST_ADDRESS || "";
  const apiKey: string = process.env.ETHERSCAN_API_KEY || "";
  const connection = new Etherscan(address, apiKey);

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

  it("#getAllTransaction - since 03/20/2021", async () => {
    const since = new Date("2021-03-20");
    await getAllTransactionsSince(connection, since.getTime());
  });
});
