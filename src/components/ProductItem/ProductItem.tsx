import { useEffect, useState } from 'react'
import './ProductItem.css'
import Product from '../../models/product'
import User from '../../models/user'
import calculatePrice from '../../../refactor/price-calculator'

interface ProductItemProps {
  product: Product
  user: User
  totalProductPrice: (totalProductPrice: number) => void
}

function ProductItem(props: ProductItemProps) {
  const { product, user, totalProductPrice } = props
  const [count, setCount] = useState(0)

  useEffect(() => {
    totalProductPrice(getTotalProductPrice())
  }, [count, user])

  const decreaseCount = () => {
    if (count > 0) { 
      setCount(count - 1) 
    }
  }

  const pricePerUnit = (): number => {
    return calculatePrice(user, product.type, product.price, product.publishedDate)
  } 

  const getTotalProductPrice = (): number => {
    return pricePerUnit() * count
  }

  return (
    <div className='item-container'>
      <div className='button-container'>
        <button type='button' className='button' onClick={() => {
          decreaseCount()
          }}>-</button>
        <h5>{product.name} <br/> {count}</h5>
        <button type='button' className='button' onClick={() => {
          setCount(count + 1)
          }}>+</button>
      </div>
      <div className='unit-container'>
        <p>Unit price: {pricePerUnit()} SEK</p>
        <p>Total price: {getTotalProductPrice()} SEK</p>
      </div>
    </div>
  )
}

export default ProductItem
