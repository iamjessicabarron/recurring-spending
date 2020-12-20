/*
  Split hunk of text into array via newlines
*/
const splitTransactions = (data: string) => {
  return data.trim().split(/\r?\n/);
};

/*
  Returns array of readable transaction data for an array of transaction strings
*/
const getTransactionData = (arr: string[]) => {
  const matchPrice = (item) => {
    // sometimes transactions contain a transaction fee as well as price
    // so we need to use the last matching price item

    const matchedItem = item.match(/(-*\$\d*\.?\d*)/g);

    return matchedItem[matchedItem.length - 1];
  };
  const matchDate = (item) => item.match(/(\d+ \w{3} \d{4})/g)[0];

  return arr
    .filter((item) => item.length > 0)
    .map((item) => {
      console.log("item", item);
      const date = matchDate(item);
      const price = -matchPrice(item).replace("$", ""); // negated on purpose
      const desc = "";

      return {
        purchaseDate: date,
        price,
        desc,
      };
    });
};

/*
  Returns array of readable transactions from a hunk of text
*/

export const getTransactions = (data) =>
  getTransactionData(splitTransactions(data));
