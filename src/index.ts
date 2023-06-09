import axios from 'axios'
import * as fs from 'fs'
import * as dotenv from 'dotenv'
import * as localData from '../local.json'

dotenv.config()

interface CurrencyExchange {
  exchangeRate: number
  fromCurrencyCode: string
  fromCurrencyName: string
  toCurrencyCode: string
  toCurrencyName: string
}

interface ConversionResult {
  currencyCode: string
  currencyName: string
  amount: number
  path: string
}

async function fetchCurrencyExchanges(): Promise<CurrencyExchange[]> {
  if (process.env.NODE_ENV == 'develop') {
    return localData
  }

  const url = `${process.env.CURRENCY_CONVERSION_API_ENDPOINT}?seed=${process.env.CURRENCY_CONVERSION_API_SEED}`
  const response = await axios.get(url)
  return response.data
}

async function findBestConversionRates(
  targetCurrency: ConversionResult
): Promise<ConversionResult[]> {
  const currencyExchanges = await fetchCurrencyExchanges()

  // exchangeMap stores the best conversion rates for each currency
  /* e.g. CAD -> HKD
    HKD: {
      currencyCode: 'HKD',
      currencyName: 'Hong Kong Dollar',
      amount: 629.9939600648,
      path: 'CAD | USD | CNY | HKD'
    },
  */
  const exchangeMap: { [currencyCode: string]: ConversionResult } = {}

  // BFS algorithm for traversing all the nodes until all currencies can no longer be converted
  const queue: ConversionResult[] = [targetCurrency]
  while (queue.length > 0) {
    const { currencyCode, currencyName, amount, path } = queue.shift()!

    // If the currency does not yet exist in the map, add a new one.
    // If the currency's amount is greater than the amount already in existence, update the value.
    if (!(currencyCode in exchangeMap) || amount > exchangeMap[currencyCode].amount) {
      exchangeMap[currencyCode] = { currencyCode, currencyName, amount, path }
      // Find currency exchanges that can be converted from that currency
      /* e.g.
        HKD -> [INR, PHP, VND]
       */
      const outgoingExchanges = currencyExchanges.filter((c) => c.fromCurrencyCode === currencyCode)

      // Iterate outgoing exchanges, convert the amount at the respective exchange rate, and update the path.
      // Add to the queue and repeat the process.
      for (const exchange of outgoingExchanges) {
        const { exchangeRate, toCurrencyCode, toCurrencyName } = exchange
        const convertedAmount = amount * exchangeRate
        const newPath = `${path} | ${toCurrencyCode}`
        queue.push({
          currencyCode: toCurrencyCode,
          currencyName: toCurrencyName,
          amount: convertedAmount,
          path: newPath,
        })
      }
    }
  }

  // Target currency (e.g. CAD) should be removed once the exchange map has created.
  delete exchangeMap[targetCurrency.currencyCode]

  return Object.values(exchangeMap)
}

function exportToCSV(conversionResults: ConversionResult[]): void {
  let csv = 'Currency Code,Currency Name,Amount,Best Path\n'

  for (const result of conversionResults) {
    const { currencyCode, currencyName, amount, path } = result
    // The decimal point is set to 6 digits as relatively small numbers such as BTC are included.
    csv += `${currencyCode},${currencyName},${amount.toFixed(6)},${path}\n`
  }

  const fileName = 'optimal_conversions.csv'
  fs.writeFileSync(fileName, csv)
  console.log(`Conversion results saved to ${fileName}`)
}

async function main(): Promise<void> {
  const targetCurrency: ConversionResult = {
    currencyCode: 'CAD',
    currencyName: 'Canada Dollar',
    amount: 100, // start amount
    path: 'CAD',
  }

  try {
    const conversionResults = await findBestConversionRates(targetCurrency)
    exportToCSV(conversionResults)
  } catch (error: any) {
    console.error('An error occurred:', error.message)
  }
}

main()
