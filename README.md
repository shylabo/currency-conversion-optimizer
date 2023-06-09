# Currency conversion optimizer

## Setup

Create .env file

```
CURRENCY_CONVERSION_API_ENDPOINT={URL without parameter}
CURRENCY_CONVERSION_API_SEED={seed value}
```

Install dependencies

```sh
$ npm install
```

## Invoke in production (request to api endpoint)

```sh
$ npm run start
```

## Invoke in develop (use local json data)

```sh
$ npm run dev
```

# Solution Overview

- Some of currencies appears more than once when a currency tree is created from CAD.
- If there are multiple ways to convert, pick one with maximum amount and minimum path.
- Traverse all the nodes using DFS algorithm until all currencies can no longer be converted.
- BBD and KYD can not be exchanged from CAD based on the response.
- The decimal point is set to 6 digits as relatively small numbers such as BTC are included.
