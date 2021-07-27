# The Crypto Janitor

## _Takes the trash out of getting crypto account data_

[![npm version](https://badge.fury.io/js/crypto-janitor.svg)](https://badge.fury.io/js/crypto-janitor) [[![Build Status](https://travis-ci.com/rileystephens28/crypto-janitor.svg?branch=main)](https://travis-ci.com/rileystephens28/crypto-janitor) [![quality](https://img.shields.io/npms-io/quality-score/crypto-janitor)]() [![language](https://img.shields.io/github/languages/top/rileystephens28/crypto-janitor)]() [![license](https://img.shields.io/github/license/rileystephens28/crypto-janitor)]()

The Crypto Janitor provides a simple interface for

- Aggregating account transactions
- Getting USD values for transactions

## Features

- Get transaction data from Bittrex, Coinbase, Coinbase Pro, and Kucoin via API keys
- Get transaction data from Nexo via CSV import
- Get transaction data from Ethereum Blockchain via address

## Dependencies

This library makes use of the following packages:

- [ccxt][ccxt] - Used to fetch data from exchange connections
- [etherscan-api][etherscan-api] - Used to fetch data from Ethereum Blockchain

## Installation

The Crypto Janitor requires [Node.js](https://nodejs.org/) v12+ to run.

Install The Crypto Janitor from npm

```sh
npm install crypto-janitor
```

Or with yarn

```sh
yarn add crypto-janitor
```

## Documentation

The Crypto Janitor API exposes

- Implemented connections (check em out)
- Connection base classes (so create your own connections!)
- Helper function to resolve and connection based on inputs

### Implemented Connections

| Name         | Type    | Params                         |
| ------------ | ------- | ------------------------------ |
| Bittrex      | API     | { apiKey, secret }             |
| Coinbase     | API     | { apiKey, secret }             |
| Coinbase Pro | API     | { apiKey, secret, password }   |
| Kucoin       | API     | { apiKey, secret, password }   |
| Etherscan    | Address | { address, apiKey }            |
| Nexo         | CSV     | { fileName, loadFileContents } |

### Base Connections

| Name | Type | Params                               |
| ---- | ---- | ------------------------------------ |
| Base | any  | { name, type, params }               |
| CCXT | API  | { name, credentials, params }        |
| CSV  | API  | { name, fileName, loadFileContents } |

### Helper Methods

| Name              | Params                 |
| ----------------- | ---------------------- |
| resolveConnection | { name, type, params } |

## Development

Want to contribute? Great!

The Crypto Janitor is written in TypeScript and tested using jest.
Make a sure all new features are tested before creating PR.

Build:

```sh
npm run build
```

Run tests:

```sh
npm run test
```

## License

MIT

**Free Software, Hell Yeah!**

[//]: # "These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax"
[ccxt]: https://github.com/ccxt/ccxt
[git-repo-url]: https://github.com/rileystephens28/crypto-janitor/blob/main/README.md
[etherscan-api]: https://github.com/sebs/etherscan-api#readme
