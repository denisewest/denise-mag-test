import { useState } from 'react'
import './ProductItem.css'
import Product from '../../models/product'
import User from '../../models/user'
import calculatePrice from '../../../refactor/price-calculator'

interface ProductItemProps {
  product: Product
  user: User
}

function ProductItem(props: ProductItemProps) {
  const [count, setCount] = useState(0)
  const decreaseCount = () => {
    if (count > 0) { 
      setCount(count - 1) 
    }
  }

  const pricePerUnit = (): number => {
    return calculatePrice(props.user, props.product.type, props.product.price, props.product.publishedDate)
  } 

  const totalProductPrice = (): number => {
    return pricePerUnit() * count
  }

  return (
    <div className='item-container'>
      <div className='button-container'>
        <button type='button' className='button' onClick={() => decreaseCount()}>-</button>
        <h5>{props.product.name} <br/> {count}</h5>
        <button type='button' className='button' onClick={() => setCount(count + 1)}>+</button>
      </div>
      <div className='unit-container'>
        <p>Price per unit: {pricePerUnit()} SEK</p>
        <p>Total price: {totalProductPrice()}</p>
      </div>
    </div>
  )
}

export default ProductItem
