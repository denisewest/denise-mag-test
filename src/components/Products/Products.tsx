import { useState } from 'react'
import getProducts from '../../utils/get-products'
import ProductItem from '../ProductItem/ProductItem'
import UserRadio from '../UserRadio/UserRadio'
import User from '../../models/user'
import './Products.css'

function Products() {
  const [userData, setUserData] = useState<User>(User.Normal)
  const [totalPrice, setTotalPrice] = useState<Map<string, number>>(new Map<string, number>())

  const products = getProducts()

  const updateTotalPrice = (key: string, value: number) => {
    const changedTotal = totalPrice.set(key, value)
    setTotalPrice(new Map(changedTotal))
  }

  console.log('totalPrice ', totalPrice)

  const calculateTotalPrice = (): number => {
    console.log(totalPrice.values())
    const total = Array.from(totalPrice.values()).reduce(
      (previousValue: number, currentValue: number) => previousValue + currentValue, 0
      )
      console.log(total)
      return total
  }

  return (
    <div id='calculator-container'>
      <div id='user-container'>
        <UserRadio onToggleChange={(user) => {
            setUserData(user)
          }} />
      </div>
      <div id='products-container'>
          {products.map((product) => {
            return (
            <div key={product.name}>
              <ProductItem product={product} user={userData} totalProductPrice={(price) => {
                updateTotalPrice(product.name, price)
                
              }} />
            </div>
            )
          })}
        <h5>Your total {calculateTotalPrice()} SEK</h5>
      </div>
    </div>
  )
}

export default Products;
