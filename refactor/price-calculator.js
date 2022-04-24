// userType, 0 = normal, 1 = company
// productType, 0 = new product, 1 = old product
// price, the price of the product
const calculatePrice = (userType, productType, price, publishedDate) => {
  // if (userType)
  try {
    const today = new Date().toDateString();
    let rebateAmount = 0;
    let productTypePrice = 35; // Old product price

    if (productType === 0) { // New product
      if (publishedDate.toDateString() === today) { // Published today
        rebateAmount = 10; // Add 10 rebate amount
      }
      productTypePrice -= 10; // Subtract 10 from old product price
    }

    if (userType === 1) { // Company user
      rebateAmount += 5; // Add 5 company rebate amount
    }

    return price + productTypePrice - rebateAmount;
  } catch (ex) {
    throw new Error(ex);
  }
};
