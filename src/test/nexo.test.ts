/* eslint-disable max-len */
import * as Papa from "papaparse";
import * as path from "path";
import * as fs from "fs";
import { Nexo } from "../targets";
import {
  getCcxtConnectionWithdrawals,
  getCcxtConnectionDeposits,
  getCcxtConnectionOrders,
} from "./utils";

describe("Nexo", () => {
  const loadFileContents = (fileName: string) => {
    const filePath: string = path.join(path.resolve(__dirname), `fixtures/${fileName}`);
    const file: Buffer = fs.readFileSync(filePath);
    const csvData: string = file.toString();
    const results: Papa.ParseResult<unknown> = Papa.parse(csvData, { header: true });
    return results.data;
  }
  const connection = new Nexo("test.csv", loadFileContents);

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
