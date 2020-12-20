import moment from "moment";
import data from "../data";
import { getTransactions } from "./read";
import { convertToCSV } from "./write";

// monthly on anniversary date
// weekly on a day of the week
// fornightly on a day of the week
// fluctuating prices
// price change

// edgcases
// public holidays, etc

// take data copied directly off of westpac website and convert it
// to an object format for code to read

/*

Methods of input: 
- Tweak an existing prediction
- Delete prediction

*/

// type SingleTransaction = {
//   id: number;
//   name: string;,
//   description: string;,
//   location: { id: string, name: string};
//   category: { id: string, name: string};
//   date: string;
//   amount: number,
//   outgoing: boolean,
//   category_id: number;
//   // add so
// }

// type Location = {}

// type RecurringPurchaseTransactionTypes = "transaction" | "prediction";

// type RecurringPurchase = {
//   id: number;
//   pricingType: "locked" | "fluctuates"; // i.e. Spotify is locked, stan/rego fluctuates
//   name: string;
// }

// // These should probably be RecurringPurchaseTransactions but whatever
// type TransactionBase = {
//   recurringPurchaseId: number;
//   purchaseDate: string;
//   price: number;
//   desc: string = "";
// }

// type Transaction = TransactionBase & {
//   diffAhead: number;
//   diffBehind: number;
//   type: "transaction"
// }

// type Prediction = TransactionBase & {
//   type: "prediction"
// }

const PREDICTIONS = [];
const TRANSACTIONS = [];

// TRANSACTION STUFF

const sortDates = (dates, reverse = false) => {
  const sortedLtR = (l, r) => moment(l).diff(moment(r));
  const sortedRtL = (l, r) => moment(r).diff(moment(l));

  return dates.sort(reverse ? sortedRtL : sortedLtR);
};

const sortByDate = (dates: TransactionBase[], reverse = false) => {
  const sortedLtR = (l, r) =>
    moment(l.purchaseDate).diff(moment(r.purchaseDate));
  const sortedRtL = (l, r) =>
    moment(r.purchaseDate).diff(moment(l.purchaseDate));

  return dates.sort(reverse ? sortedRtL : sortedLtR);
};

/*
  Accumulates data ahead and behind of each date so
  we can determine if there is a pattern
  
  Almost definitely should be cleaned up
*/
const discoverRecurringDates = (
  unsortedDates: TransactionBase[]
): Transaction[] => {
  const dates = sortByDate(unsortedDates);
  const reducedAhead = dates.reduce(({ prev, acc = [] }, date) => {
    const diffDays = prev
      ? moment(date.purchaseDate).diff(moment(prev.purchaseDate), "days")
      : 0;
    const arr = [
      ...acc,
      {
        purchaseDate: moment(date.purchaseDate).format("YYYY-MM-DD"),
        price: date.price,
        diffBehind: diffDays,
      },
    ];

    return { prev: date, acc: arr };
  }, dates[0]);

  const reducedBehind = reducedAhead.acc.reduceRight(
    ({ prev, acc = [] }, date) => {
      const diffDays = prev
        ? moment(prev.purchaseDate).diff(moment(date.purchaseDate), "days")
        : 0;

      const arr = [
        ...acc,
        {
          ...date,
          diffAhead: diffDays,
        },
      ];

      return {
        prev: date,
        acc: arr,
      };
    },
    dates[0]
  );

  return reducedBehind.acc;
};

/*
  Group recurring dates together
  
  Atm not very useful, needs way more work
*/
const mergeRecurringDates = (arr) => {
  // console.log(arr)

  const reduced = arr.reduce(({ prev, acc = {} }, purchase) => {
    const { diffBehind, diffAhead, str, purchaseDate } = purchase;

    const currentKey = diffBehind; // because we're going in the backwards direction? Idk maybe fix this

    const isRecurring =
      prev && (prev.diffAhead === diffBehind || prev.diffBehind == diffBehind);

    //     const matchingKey = (prev) => {
    //       if (prev.diffAhead === diffBehind) {
    //         return prev.diffAhead;
    //       }

    //       if (prev.diffBehind === diffBehind) {
    //         return prev.diffBehind
    //       }

    //       return 666;
    //     }

    // console.log(prev, purchase)

    if (isRecurring) {
      return {
        prev: purchase,
        acc: {
          ...acc,
          [diffAhead]: [...acc[diffAhead], purchase],
          [diffBehind]: [...acc[diffBehind], purchase],
        },
      };
    }

    return {
      prev: purchase,
      acc: { ...acc, [currentKey]: [purchase] },
    };
  }, arr[0]);

  // sort order of keys
  // what is arr ? probs use something else

  //   const myArr = { ...reduced.acc }

  //   const sortedKeys = Object
  //     .keys(reduced.acc)
  //     .sort((l, r) => {

  //      const left = myArr[l][0].purchaseDate; // TODO: Sort these arrays before accessing 0?
  //      const right = myArr[r][0].purchaseDate;

  //      return moment(left).diff(moment(right));
  //   });

  //   const secondPass = sortedKeys.reduce(({prev, acc = {}}, setKey) => {

  //     const sortedArr = sortDates(myArr[setKey]);
  //     const currentPurchase = myArr[setKey][0];

  //     const diff = currentPurchase.diff;

  //     console.log(currentPurchase, diff);

  //     const isRecurring = prev && prev.diff === diff;

  //     // console.log(myArr[setKey][0]);

  //     return {
  //       prev: currentPurchase,
  //       acc: {
  //         ...acc,
  //         [diff]: [currentPurchase, ...myArr[setKey]]
  //       }
  //     }
  //   }, sortedKeys[0]);

  // console.log("first pass")
  // console.log(reduced.acc);
  // console.log("second pass")
  // console.log(secondPass.acc);

  return reduced.acc;

  //   // we don't know until three purchases along that we have a set so
  //   // we need to scrape through a second time catch the first set
};

const calcAverage = (nums) => {
  return nums.reduce((a, b) => a + b) / nums.length;
};

const getJustDates = (arr: Transaction[]) => arr.map((x) => x.purchaseDate);

const predictFuturePurchases = (
  transactions: Transaction[],
  toDate: string,
  averagePeriod
) => {
  const latestTransaction = sortByDate(transactions, true)[0];
  const latestDate = moment(latestTransaction.purchaseDate);
  const diff = moment(toDate).diff(moment(latestDate), "days");

  console.log(latestTransaction, latestDate, diff);

  const numberOfSteps = Math.floor(diff / averagePeriod);

  // we don't want to add '0', so skip the first one
  const emptyArray = Array(numberOfSteps).fill("");

  return emptyArray.map((_, index) => {
    const date = latestDate
      .clone()
      .add((index + 1) * averagePeriod, "days")
      .format("YYYY-MM-DD");

    return {
      purchaseDate: date,
      price: latestTransaction.price,
      type: "prediction",
    };
  });
};

const printDiscoveredPatterns = (name, data) => {
  const transactions = getTransactions(data);
  const recurringTransactions = discoverRecurringDates(transactions);

  const justDates = getJustDates(recurringTransactions);

  recurringTransactions.map((item) => {
    const day = moment(item.purchaseDate).format("ddd");
    const month = moment(item.purchaseDate).format("MM");
    // console.log(`${day} -- ${month} -- ${item.purchaseDate} -- ${item.diffBehind} days since last transaction -- ${item.price} `);
  });

  const justPeriods = recurringTransactions
    .map((x) => x.diffBehind)
    .filter((x) => x !== 0);
  const averagePeriod = calcAverage(justPeriods);

  const prediction = moment(sortDates(justDates, true)[0])
    .add(averagePeriod, "days")
    .format("YYYY-MM-DD");

  console.log(
    `On average, charged every ${averagePeriod} days, but could be charged between ${Math.min(
      ...justPeriods
    )} and ${Math.max(...justPeriods)} days`
  );
  // console.log(`Purchases for 2020 will probably be: `)

  const predictedPurchases = predictFuturePurchases(
    recurringTransactions,
    "2022-01-01",
    averagePeriod
  );

  const csv = convertToCSV(name, predictedPurchases);
  console.log(csv);
  return csv;
};

// if price changes every week
// use average (potentially with std deviation)
// if price stays consistent
// use price of last transaction

/*
Append CSV to HTML
*/

const root = document.getElementById("root");
const textBox = document.createElement("textarea");

Object.entries(data).forEach(([prop, value]) => {
  const text = document.createTextNode(
    printDiscoveredPatterns(prop, value.transactions)
  );
  textBox.appendChild(text);
});

root.appendChild(textBox);
