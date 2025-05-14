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

  const [userType, setUserType] = useState('');
  const [password, setPassword] = useState('');

  // Read URL parameters for userType and password on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('userType');
    const passParam = urlParams.get('password');
    
    if (typeParam) setUserType(typeParam);
    if (passParam) setPassword(passParam);
  }, []);

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

  // Update UI to show the current mode
  useEffect(() => {
    // When userType changes, clear any cached prices to force re-fetching
    // This ensures we get the correct price level for the current user type
    setPrices({});
    
    // If we're in dealer mode with URL params, make sure the UI reflects that
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('userType')) {
      document.title = `Preisrechner (${urlParams.get('userType')})`;
    } else {
      document.title = 'Ersatzteil Preisrechner';
    }
  }, [userType]);

  // Helper to create API URL with correct parameters
  const getApiUrlWithParams = (baseUrl, id) => {
    let url = `${baseUrl}${id}`;
    
    if (userType || password) {
      url += '&';
      const params = [];
      if (userType) params.push(`userType=${encodeURIComponent(userType)}`);
      if (password) params.push(`password=${encodeURIComponent(password)}`);
      url += params.join('&');
    }
    
    return url;
  };

  // Update handleCreateOffer to use the helper function
  const handleCreateOffer = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const url = getApiUrlWithParams(PRICE_API, id);
      console.log('Fetching price with URL:', url);
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Price data received:', data);
      
      setPrices((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      console.error('Error fetching price:', err);
      setError(`Failed to fetch price: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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
      <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <h1 style={{ margin: 0, textAlign: 'center', width: '100%' }}>Ersatzteil Preisrechner</h1>
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
        
        {/* Display user type as a badge if set, but no controls */}
        {userType && (
          <div style={{ 
            marginLeft: 'auto',
            backgroundColor: '#dff0d8', 
            color: '#3c763d', 
            padding: '0.3rem 0.6rem', 
            borderRadius: '4px',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}>
            {userType === 'dealer' ? 'Händleransicht' : userType}
            {password && ' (mit Passwort)'}
          </div>
        )}
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
              {loading ? 'Lädt...' : 'Preise anzeigen'}
            </button>
            <div className="product-price-info">
              {prices[product.id] ? (
                prices[product.id].error === 'No provider cost found for product id ' + product.id ? (
                  <div style={{ color: 'red', fontWeight: 'bold' }}>Out of stock!</div>
                ) : (
                  <div>
                    <div>Kunde: {prices[product.id].customer_price}€</div>
                    
                    {/* Show dealer price if available */}
                    {prices[product.id].dealer_price && (
                      <div>Händler: {prices[product.id].dealer_price}€</div>
                    )}
                    
                    <div>Anbieter: {prices[product.id].provider}</div>
                    
                    {/* Show detailed provider info if available */}
                    {prices[product.id].all_providers && (
                      <div style={{ marginTop: '10px', textAlign: 'left' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Alle Anbieter:</div>
                        <table style={{ width: '100%', fontSize: '0.9em', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '2px 5px' }}>Anbieter</th>
                              <th style={{ textAlign: 'right', padding: '2px 5px' }}>EK</th>
                              <th style={{ textAlign: 'right', padding: '2px 5px' }}>Händler</th>
                              <th style={{ textAlign: 'right', padding: '2px 5px' }}>Kunde</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(prices[product.id].all_providers).map(([provider, priceInfo]) => (
                              <tr key={provider}>
                                <td style={{ textAlign: 'left', padding: '2px 5px' }}>{provider}</td>
                                <td style={{ textAlign: 'right', padding: '2px 5px' }}>{priceInfo.cost}€</td>
                                <td style={{ textAlign: 'right', padding: '2px 5px' }}>{priceInfo.dealer_price}€</td>
                                <td style={{ textAlign: 'right', padding: '2px 5px' }}>{priceInfo.customer_price}€</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {prices[product.id].expire_time_ms && (
                      <div style={{ color: '#e67e22', fontWeight: 500, marginTop: 4 }}>
                        Angebot läuft ab in {getMinutesLeft(prices[product.id].expire_time_ms)} Minuten
                      </div>
                    )}
                  </div>
                )
              ) : '-'}
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
      <footer className="footer" style={{
        marginTop: '2rem',
        background: 'var(--primary-color)',
        color: '#fff',
        padding: '2rem 1rem',
        borderRadius: '0 0 8px 8px',
        textAlign: 'center',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
          <strong>Köln Handyreparatur</strong> &mdash; Neusser Str. 278, 50733 Köln<br/>
          <a href="mailto:info@koelnhandyreparatur.de" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 500 }}>info@koelnhandyreparatur.de</a>
        </div>
        <div style={{ margin: '0.5rem 0' }}>
          <a href="https://koelnhandyreparatur.de/" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500, marginRight: 16 }}>
            Website
          </a>
          <a href="https://wa.me/491733698233" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, color: '#25D366', background: '#23272f', borderRadius: 6, padding: '0.3em 0.8em', fontWeight: 500, textDecoration: 'none', boxShadow: '0 1px 4px rgba(25, 118, 210, 0.10)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: 4 }}><path d="M12.004 2.003c-5.523 0-9.997 4.474-9.997 9.997 0 1.762.464 3.484 1.345 4.997l-1.409 5.151a1 1 0 0 0 1.225 1.225l5.151-1.409a9.963 9.963 0 0 0 4.997 1.345c5.523 0 9.997-4.474 9.997-9.997s-4.474-9.997-9.997-9.997zm0 18.001a7.96 7.96 0 0 1-4.073-1.144l-.29-.172-3.057.837.837-3.057-.172-.29a7.96 7.96 0 0 1-1.144-4.073c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.425-5.842c-.242-.121-1.434-.707-1.655-.788-.221-.081-.382-.121-.543.121-.161.242-.623.788-.764.949-.141.161-.282.181-.524.06-.242-.121-1.022-.377-1.947-1.202-.72-.642-1.207-1.433-1.35-1.675-.141-.242-.015-.373.106-.494.109-.108.242-.282.363-.423.121-.141.161-.242.242-.403.081-.161.04-.302-.02-.423-.06-.121-.543-1.312-.744-1.797-.196-.471-.396-.406-.543-.414l-.463-.008c-.161 0-.423.06-.646.282-.221.221-.846.827-.846 2.017 0 1.19.866 2.341.986 2.502.121.161 1.703 2.6 4.132 3.543.578.199 1.028.317 1.379.406.579.147 1.106.126 1.523.077.465-.056 1.434-.586 1.637-1.152.202-.566.202-1.051.141-1.152-.06-.101-.221-.161-.463-.282z"/></svg>
            WhatsApp
          </a>
        </div>
        <div style={{ fontSize: '0.95rem', color: '#b0b3b8', marginTop: 8 }}>
          © 2023 Köln Handyreparatur - Alle Rechte vorbehalten
        </div>
      </footer>
    </div>
  )
}

export default App
