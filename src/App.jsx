import { useEffect, useState } from 'react'
import './App.css'
import logo from '/images/logo.png';

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
  const [modalImg, setModalImg] = useState(null)

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
      <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1rem' }}>
        <a href="https://koelnhandyreparatur.de/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
          <img src={logo} alt="Köln Handyreparatur Logo" style={{ height: '70px', verticalAlign: 'middle' }} />
        </a>
        <h1 style={{ margin: 0 }}>Ersatzteil Preisrechner</h1>
      </header>
      {error && <div className="error">{error}</div>}
      {fetchingProducts && <div className="loading">Produkte werden geladen...</div>}
      <div className="product-list-container">
        <table className="product-table">
          <colgroup>
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>Bild</th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('id')}>
                ID {sortBy === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th>Angebot</th>
              <th>Preis</th>
            </tr>
            <tr>
              <th></th>
              <th>
                <input
                  type="text"
                  placeholder="ID filtern"
                  value={filterId}
                  onChange={e => { setFilterId(e.target.value); setPage(1); }}
                  style={{ width: '90%' }}
                />
              </th>
              <th>
                <input
                  type="text"
                  placeholder="Name filtern"
                  value={filterName}
                  onChange={e => { setFilterName(e.target.value); setPage(1); }}
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
                    alt={product.name || 'Produktbild'}
                    className="product-img"
                    onError={handleImgError}
                    loading="lazy"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setModalImg(`/images/${product.id}.jpg`)}
                  />
                </td>
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>
                  <button onClick={() => handleCreateOffer(product.id)} disabled={loading}>
                    {loading ? 'Lädt...' : 'Neues Angebot erstellen'}
                  </button>
                </td>
                <td>
                  {prices[product.id]
                    ? <div>
                        <div>Kunde: {prices[product.id].customer_price}€</div>
                        <div>Händler: {prices[product.id].dealer_price}€</div>
                        <div>Anbieter: {prices[product.id].provider}</div>
                      </div>
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>&lt; Zurück</button>
          <span>Seite {page} von {totalPages}</span>
          <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>Weiter &gt;</button>
        </div>
      </div>
      {modalImg && (
        <div
          className="modal-backdrop"
          onClick={() => setModalImg(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <img
            src={modalImg}
            alt="Großes Bild"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '10px',
              background: '#fff',
              padding: '10px'
            }}
            onClick={e => e.stopPropagation()}
            onError={handleImgError}
          />
        </div>
      )}
    </div>
  )
}

export default App
