import { useState } from 'react'
import './Products.css'
import getProducts from '../../utils/get-products'
import Product from '../../models/product'
import ProductItem from '../ProductItem/ProductItem'
import Form from '../Form/Form'
import UserRadio from '../UserRadio/UserRadio'
import User from '../../models/user'

function Products() {
  const [userData, setUserData] = useState<User>(User.Normal)
  const [totalPrice, setTotalPrice] = useState<Map<string, number>>(new Map<string, number>())
  const [products, setProducts] = useState<Product[]>(getProducts())

  const updateTotalPrice = (key: string, value: number) => {
    const changedTotal = totalPrice.set(key, value)
    setTotalPrice(new Map(changedTotal))
  }

  const calculateTotalPrice = (): number => {
    const total = Array.from(totalPrice.values()).reduce(
      (previousValue: number, currentValue: number) => previousValue + currentValue, 0
      )
      return total
  }

  return (
    <div id='calculator-container'>
      <div id='user-container'>
        <UserRadio onToggleChange={(user) => {
            setUserData(user)
          }} />
      </div>
      <h4>Your total {calculateTotalPrice()} SEK</h4>
      <div id='products-container'>
        <div id='items-container'>
          {products.map((product) => {
            return (
            <div key={product.name}>
              <ProductItem product={product} user={userData} totalProductPrice={(price) => {
                updateTotalPrice(product.name, price)
                
              }} />
            </div>
            )
          })}
        </div>
        <div id='form-container'>
          <Form onAddProduct={(product) => {
            const currentProducts = Array.from(products)
            currentProducts.push(product)
            setProducts(currentProducts)
          }} />
        </div>
      </div>
    </div>
  )
}

export default Products
