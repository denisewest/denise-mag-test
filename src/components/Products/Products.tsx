import { useState } from 'react'
import getProducts from '../../utils/get-products'
import ProductItem from '../ProductItem/ProductItem'
import UserRadio from '../UserRadio/UserRadio'
import User from '../../models/user'
import './Products.css'

function Products() {
  const [userData, setUserData] = useState<User>(User.Normal)
  const products = getProducts()
  return (
    <div>
      <div id='usercontainer'>
        <UserRadio onToggleChange={(user) => {
            setUserData(user)
          }} />
      </div>
      <div id='products-container'>
        <fieldset>
        <legend>Products</legend>
          {products.map((product) => {
            return (
            <div>
              <ProductItem product={product} user={userData} />
            </div>
            )
          })}
        </fieldset>
      </div>
    </div>
  )
}

export default Products;
