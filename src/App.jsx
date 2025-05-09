import { useEffect, useState } from 'react'
import './App.css'

const isProd = window.location.hostname === 'app.koelnhandyreparatur.de';
const PRODUCTS_API = isProd
  ? 'https://api.koelnhandyreparatur.de/products'
  : '/api/products';
const PRICE_API = isProd
  ? 'https://api.koelnhandyreparatur.de/price?product_id='
  : '/api/price?product_id=';
const PLACEHOLDER_IMG = '/images/placeholder.jpg'

function App() {
  const [products, setProducts] = useState([])
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(PRODUCTS_API)
      .then((res) => res.json())
      .then(setProducts)
      .catch((err) => setError('Failed to load products'))
  }, [])

  const handleCreateOffer = async (aswoId) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${PRICE_API}${aswoId}`)
      const data = await res.json()
      setPrices((prev) => ({ ...prev, [aswoId]: data.price }))
    } catch (err) {
      setError('Failed to fetch price')
    } finally {
      setLoading(false)
    }
  }

  // Helper to handle image fallback
  const handleImgError = (e) => {
    e.target.src = PLACEHOLDER_IMG
  }

  return (
    <div className="App">
      <header className="header">
        <h1>Phone Parts Price Calculator</h1>
      </header>
      {error && <div className="error">{error}</div>}
      <div className="product-list-container">
        <table className="product-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>aswoId</th>
              <th>Offer</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.aswoId}>
                <td>
                  <img
                    src={`/images/${product.aswoId}.jpg`}
                    alt={product.name}
                    className="product-img"
                    onError={handleImgError}
                  />
                </td>
                <td>{product.name}</td>
                <td>{product.aswoId}</td>
                <td>
                  <button onClick={() => handleCreateOffer(product.aswoId)} disabled={loading}>
                    Create New Offer
                  </button>
                </td>
                <td>{prices[product.aswoId] ? prices[product.aswoId] : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App
