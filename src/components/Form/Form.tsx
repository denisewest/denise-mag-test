import { FormEvent, useState } from 'react'
import './Form.css'
import Product from '../../models/product'

interface FormProps {
  onAddProduct: (product: Product) => void
}

function Form(props: FormProps) {
  const [productName, setProductName] = useState('')
  const [productType, setProductType] = useState(0)
  const [productPrice, setProductPrice] = useState(0)
  const [publishedDate, setPublishedDate] = useState('')
  const { onAddProduct } = props

  const submitValues = (event: FormEvent) => {
    event.preventDefault()

   const product: Product = {
    name: productName,
    type: productType,
    price: productPrice,
    publishedDate: new Date(publishedDate)
   }

   onAddProduct(product)
  }

  return (
    <div id='form'>
      <h5>Add product</h5>
      <form method='post' autoComplete='off'>
        <label htmlFor='name'>Product name</label>
        <input type='text' id='name' required onChange={e => setProductName(e.target.value)} />
        <label htmlFor='price'>Product price</label>
        <input type='number' id='price' min='0' required onChange={e => setProductPrice(Number(e.target.value))}/>
        <label htmlFor='date'>Published date</label>
        <input type='date' id='date' required onChange={e => setPublishedDate(e.target.value)}/>
        <label htmlFor='type'>Product type</label>
        <select onChange={e => setProductType(Number(e.target.value))}>
          <option value='0' className='type'>New</option>
          <option value='1' className='type'>Old</option>
        </select>
        <input onClick={submitValues} type='submit' className='button' value='Add' />
      </form>
    </div>
  )
}

export default Form
