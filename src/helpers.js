import { bech32 } from 'bech32'

export function shortenPublicKey(publicKey, len) {
  try {
    if (len) {
      return publicKey.slice(0, len);
    }
    return publicKey.slice(0, 5) + "..." + publicKey.slice(-5);
  } catch (e) {
    return publicKey;
  }
}

export function processCsvData(csvContent) {
  let lines = csvContent.split("\n");
  lines = lines.filter(Boolean);
  if (isNaN(lines[0].split(",")[1])) {
    lines.shift(); // Remove the first line if it's a label
  }

  const validEntries = [];
  let totalAmount = 0;

  lines.forEach((line) => {
    const [address, amountString] = line.split(",");
    const cleanedAmount = amountString.replace(/\r/g, "").trim();
    const amount = parseFloat(cleanedAmount);

    if (isAddressValid(address) && isAmountValid(amount)) {
      validEntries.push({
        recipient: address.toLowerCase().trim(),
        amount: cleanedAmount,
      });
      totalAmount += amount;
    }
  });

  console.log("validEntries", validEntries);
  return {
    totalAmount,
    recipients: validEntries,
  };
}

export function isAddressValid(address) {
  const lowerCased = address.toLowerCase();
  try {
    const decoded = bech32.decode(lowerCased);
    if (decoded.prefix !== "sei") return false; // Invalid address
    return true; // valid address
  } catch (error) {
    return false; // Invalid address
  }
}

export function isAmountValid(amount) {
    return !isNaN(amount) && amount > 0;
}

export function formatAmountsToSmallestUnits(array, decimals) {
    return array.map(item => {
        const amountInSmallestUnits = (parseFloat(item.amount) * Math.pow(10, decimals)).toFixed(0);
        return { ...item, amount: amountInSmallestUnits };
    });
}

export function splitIntoChunks(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
