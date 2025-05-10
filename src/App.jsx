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

const PAGE_SIZE = 10;

function App() {
  const [products, setProducts] = useState([])
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fetchingProducts, setFetchingProducts] = useState(false)

  // Paging, sorting, filtering state
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [filterName, setFilterName] = useState('')
  const [filterId, setFilterId] = useState('')

  useEffect(() => {
    setFetchingProducts(true)
    fetch(PRODUCTS_API)
      .then((res) => res.json())
      .then(setProducts)
      .catch((err) => setError('Failed to load products'))
      .finally(() => setFetchingProducts(false))
  }, [])

  const handleCreateOffer = async (id) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${PRICE_API}${id}`)
      const data = await res.json()
      setPrices((prev) => ({ ...prev, [id]: data }))
    } catch (err) {
      setError('Failed to fetch price')
    } finally {
      setLoading(false)
    }
  }

  // Helper to handle image fallback
  const handleImgError = (e) => {
    if (!e.target.src.endsWith(PLACEHOLDER_IMG)) {
      e.target.src = PLACEHOLDER_IMG;
      e.target.onerror = null;
    }
  }

  // Filtering
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(filterName.toLowerCase()) &&
    String(product.id).toLowerCase().includes(filterId.toLowerCase())
  )

  // Sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let valA = a[sortBy]
    let valB = b[sortBy]
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  // Paging
  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE)
  const pagedProducts = sortedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  return (
    <div className="App">
      <header className="header">
        <h1>Phone Parts Price Calculator</h1>
      </header>
      {error && <div className="error">{error}</div>}
      {fetchingProducts && <div className="loading">Loading products...</div>}
      <div className="product-list-container">
        <table className="product-table">
          <thead>
            <tr>
              <th>Image</th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('id')}>
                ID {sortBy === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th>Offer</th>
              <th>Price</th>
            </tr>
            <tr>
              <th></th>
              <th>
                <input
                  type="text"
                  placeholder="Filter by name"
                  value={filterName}
                  onChange={e => { setFilterName(e.target.value); setPage(1); }}
                  style={{ width: '90%' }}
                />
              </th>
              <th>
                <input
                  type="text"
                  placeholder="Filter by ID"
                  value={filterId}
                  onChange={e => { setFilterId(e.target.value); setPage(1); }}
                  style={{ width: '90%' }}
                />
              </th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pagedProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  <img
                    src={`/images/${product.id}.jpg`}
                    alt={product.name || 'Product thumbnail'}
                    className="product-img"
                    onError={handleImgError}
                    loading="lazy"
                  />
                </td>
                <td>{product.name}</td>
                <td>{product.id}</td>
                <td>
                  <button onClick={() => handleCreateOffer(product.id)} disabled={loading}>
                    {loading ? 'Loading...' : 'Create New Offer'}
                  </button>
                </td>
                <td>
                  {prices[product.id]
                    ? <div>
                        <div>Customer: {prices[product.id].customer_price}€</div>
                        <div>Dealer: {prices[product.id].dealer_price}€</div>
                        <div>Provider: {prices[product.id].provider}</div>
                      </div>
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>&lt; Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>Next &gt;</button>
        </div>
      </div>
    </div>
  )
}

export default App
