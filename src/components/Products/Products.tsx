import getProducts from '../../utils/get-products'
import ProductItem from '../ProductItem/ProductItem'
import './Products.css'

function Products() {
  const products = getProducts()
  return (
    <div id='products-container'>
      <fieldset>
      <legend>Products</legend>
        {products.map((product) => {
          return (
          <div>
            <ProductItem product={product} />
          </div>
          )
        })}
      </fieldset>
    </div>
  )
}

export default Products;
