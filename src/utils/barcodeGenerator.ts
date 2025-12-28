// Barcode generation utilities

export type BarcodeType = "EAN13" | "CODE128" | "UPC";

/**
 * Generate a random barcode based on the specified type
 */
export const generateRandomBarcode = (type: BarcodeType = "EAN13"): string => {
  if (type === "EAN13") {
    // Generate 12 digits, the 13th is checksum
    let code = "";
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10);
    }
    // Calculate EAN-13 checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return code + checksum;
  } else if (type === "UPC") {
    // Generate 11 digits, 12th is checksum
    let code = "";
    for (let i = 0; i < 11; i++) {
      code += Math.floor(Math.random() * 10);
    }
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 3 : 1);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return code + checksum;
  } else {
    // CODE128 - alphanumeric
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
};

/**
 * Generate a product-specific barcode using item number as seed
 */
export const generateProductBarcode = (itemNumber: string): string => {
  // Use item number as prefix, pad with random numbers to make EAN-13
  const cleanNumber = itemNumber.replace(/\D/g, "").slice(0, 7);
  const paddedNumber = cleanNumber.padStart(7, "0");
  
  // Add 5 random digits
  let code = paddedNumber;
  for (let i = 0; i < 5; i++) {
    code += Math.floor(Math.random() * 10);
  }
  
  // Calculate EAN-13 checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  
  return code + checksum;
};

/**
 * Validate EAN-13 barcode
 */
export const validateEAN13 = (barcode: string): boolean => {
  if (!/^\d{13}$/.test(barcode)) return false;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  
  return checksum === parseInt(barcode[12]);
};
