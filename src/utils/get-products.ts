import Product from '../models/product'

const getProducts = (): Product[] => {
  const banana: Product = {
    name: 'Banana',
    type: 1,
    price: 1,
    publishedDate: new Date('2021-12-10'),
  }

  const peach: Product = {
    name: 'Peach',
    type: 0,
    price: 2,
    publishedDate: new Date()
  }

  const mango: Product = {
    name: 'Mango',
    type: 0,
    price: 2,
    publishedDate: new Date('2022-04-23')
  }

  return [banana, peach, mango]
}

export default getProducts
