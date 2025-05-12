import { useEffect, useState } from 'react'
import './App.css'
import logo from '/images/logo.png';

const isProd = window.location.hostname === 'app.koelnhandyreparatur.de';
const PRODUCTS_API = isProd
  ? 'https://api.koelnhandyreparatur.de/products'
  : '/api/products';
const CATEGORIES_API = isProd
  ? 'https://api.koelnhandyreparatur.de/categories'
  : '/api/categories';
const PRICE_API = isProd
  ? 'https://api.koelnhandyreparatur.de/price?product_id='
  : '/api/price?product_id=';
const PLACEHOLDER_IMG = '/images/thumbnail.jpg'

const PAGE_SIZE = 15; // 3 columns x 5 rows

function App() {
  const [products, setProducts] = useState([])
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fetchingProducts, setFetchingProducts] = useState(false)
  const [modalImg, setModalImg] = useState(null)
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Paging, sorting, filtering state
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [filterName, setFilterName] = useState('')
  const [filterId, setFilterId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Fetch categories on mount
  useEffect(() => {
    fetch(CATEGORIES_API)
      .then(res => res.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Build query string for selected categories
  const categoryQuery = selectedCategories
    .map((cat, idx) => cat ? `category${idx+1}=${encodeURIComponent(cat)}` : null)
    .filter(Boolean)
    .join('&');

  useEffect(() => {
    setFetchingProducts(true)
    let url = PRODUCTS_API;
    const params = [];
    if (searchTerm) params.push(`name=${encodeURIComponent(searchTerm)}`);
    if (categoryQuery) params.push(categoryQuery);
    if (params.length) url += '?' + params.join('&');
    fetch(url)
      .then((res) => res.json())
      .then(setProducts)
      .catch((err) => setError('Failed to load products'))
      .finally(() => setFetchingProducts(false))
  }, [searchTerm, categoryQuery])

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

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setPage(1);
  };

  // Category dropdown handlers
  const handleCategoryChange = (level, value) => {
    const newSelected = selectedCategories.slice(0, level);
    newSelected[level] = value;
    setSelectedCategories(newSelected);
    setPage(1);
    // Scroll to top of filter bar for better UX
    setTimeout(() => {
      const filterBar = document.querySelector('.filter-bar');
      if (filterBar) {
        filterBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };

  // Helper to get children for a given level
  const getCategoryChildren = (level) => {
    let node = { children: categories };
    for (let i = 0; i < level; i++) {
      const found = (node.children || []).find(c => c.name === selectedCategories[i]);
      if (!found) return [];
      node = found;
    }
    return node.children || [];
  };

  // Helper to get minutes left until offer expires
  const getMinutesLeft = (expireTimeMs) => {
    const now = Date.now();
    const diffMs = expireTimeMs - now;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 60000);
  };

  return (
    <div className="App">
      <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1rem' }}>
        <a href="https://koelnhandyreparatur.de/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
          <img src={logo} alt="Köln Handyreparatur Logo" style={{ height: '70px', verticalAlign: 'middle' }} />
        </a>
        <h1 style={{ margin: 0 }}>Ersatzteil Preisrechner</h1>
      </header>
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Produkte suchen..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { handleSearch(e); } }}
        />
        <button type="button" onClick={handleSearch}>Suchen</button>
        {searchTerm && (
          <button type="button" onClick={handleClearSearch}>Zurücksetzen</button>
        )}
        {Array.from({ length: 5 }).map((_, level) => {
          const options = getCategoryChildren(level);
          if (!options.length) return null;
          return (
            <select
              key={level}
              value={selectedCategories[level] || ''}
              onChange={e => handleCategoryChange(level, e.target.value)}
            >
              <option value="">{level === 0 ? 'Kategorie wählen' : 'Unterkategorie wählen'}</option>
              {options.map(opt => (
                <option key={opt.name} value={opt.name}>{opt.name}</option>
              ))}
            </select>
          );
        })}
      </div>
      {error && <div className="error">{error}</div>}
      {fetchingProducts && <div className="loading">Produkte werden geladen...</div>}
      <div className="product-list-grid">
        {pagedProducts.map((product) => (
          <div className="product-card" key={product.id}>
            <img
              src={`/images/${product.id}.jpg`}
              alt={product.name || 'Produktbild'}
              className="product-img-large"
              onError={handleImgError}
              loading="lazy"
              style={{ cursor: 'pointer' }}
              onClick={() => setModalImg(`/images/${product.id}.jpg`)}
            />
            <div className="product-name">{product.name}</div>
            <button onClick={() => handleCreateOffer(product.id)} disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Lädt...' : 'Neues Angebot erstellen'}
            </button>
            <div className="product-price-info">
              {prices[product.id]
                ? prices[product.id].error === 'No provider cost found for product id ' + product.id
                  ? <div style={{ color: 'red', fontWeight: 'bold' }}>Out of stock!</div>
                  : <div>
                      <div>Kunde: {prices[product.id].customer_price}€</div>
                      <div>Händler: {prices[product.id].dealer_price}€</div>
                      <div>Anbieter: {prices[product.id].provider}</div>
                      {prices[product.id].expire_time_ms && (
                        <div style={{ color: '#e67e22', fontWeight: 500, marginTop: 4 }}>
                          Angebot läuft ab in {getMinutesLeft(prices[product.id].expire_time_ms)} Minuten
                        </div>
                      )}
                    </div>
                : '-'}
            </div>
          </div>
        ))}
      </div>
      <div className="pagination" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
        <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>&lt; Zurück</button>
        <span>Seite {page} von {totalPages}</span>
        <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>Weiter &gt;</button>
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
