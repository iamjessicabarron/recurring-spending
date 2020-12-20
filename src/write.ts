/*
  Given name of transaction, and set of transactions, 
  convert to array with headers
*/
export const convertToCSV = (name: string, transactions: Transaction[]) => {
  const namedTransactions = transactions.map((transaction) => {
    return { ...transaction, name };
  });

  const newLine = "\r\n";
  // const header = [Object.keys(namedTransactions[0]).join(","), newLine].join(
  //   ""
  // );

  const rows = namedTransactions.map((row) => {
    const rowValues = Object.values(row).join(",");
    return [rowValues, newLine].join("");
  });

  // return [header, rows.join("")].join("");
  return [rows.join("")].join("");
};
