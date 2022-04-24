// import { describe, it, expect } from './libs/mocha';
// import calculatePrice from '../price-calculator';

describe('priceCalculator', () => {
  describe('private user', () => {
    it('should calculate new product published today correctly', () => {
      const expected = 16;
      const actual = calculatePrice(0, 0, 1, new Date());
      expect(expected).to.equal(actual);
    });
    it('should calculate new product published in the past correctly', () => {
      const expected = 26;
      const actual = calculatePrice(0, 0, 1, new Date(1900, 1, 1));
      expect(expected).to.equal(actual);
    });
    it('should calculate old product published today correctly', () => {
      const expected = 36;
      const actual = calculatePrice(0, 1, 1, new Date());
      expect(expected).to.equal(actual);
    });
  });

  describe('company user', () => {
    it('should calculate new product published today correctly', () => {
      const expected = 11;
      const actual = calculatePrice(1, 0, 1, new Date());
      expect(expected).to.equal(actual);
    });
    it('should calculate new product published in the past correctly', () => {
      const expected = 21;
      const actual = calculatePrice(1, 0, 1, new Date(1900, 1, 1));
      expect(expected).to.equal(actual);
    });
    it('should calculate old product published today correctly', () => {
      const expected = 31;
      const actual = calculatePrice(1, 1, 1, new Date());
      expect(expected).to.equal(actual);
    });
  });
});
