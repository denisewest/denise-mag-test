// Enums for user types
const UserTypes = Object.freeze({
  Normal: 0,
  Company: 1,
});

// Enums for product types
const ProductTypes = Object.freeze({
  New: 0,
  Old: 1,
});

/**
 * Calculates the current price of a product for a type of user.
 *
 * @param {number} userType - the type of a user
 * @param {number} productType - the type of a product
 * @param {number} price - the price of a productType
 * @param {Date Object} publishedDate - the publishing date of a product
 * @returns {number} the current price of a product
 */
const calculatePrice = (userType, productType, price, publishedDate) => {
  if (!Object.values(UserTypes).includes(userType)) {
    throw new Error('Invalid user type.');
  }

  if (!Object.values(ProductTypes).includes(productType)) {
    throw new Error('Invalid product type.');
  }

  const today = new Date().toDateString();
  let rebateAmount = 0;
  let productTypePrice = 35; // Old product price

  if (productType === ProductTypes.New) {
    if (publishedDate.toDateString() === today) { // Published today
      rebateAmount = 10; // Add 10 rebate amount
    }
    productTypePrice -= 10; // Subtract 10 from old product price
  }

  if (userType === UserTypes.Company) {
    rebateAmount += 5; // Add 5 company rebate amount
  }

  return price + productTypePrice - rebateAmount;
};
