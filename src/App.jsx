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

  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [categoryMenuStack, setCategoryMenuStack] = useState([]); // stack of category levels

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

  // Helper to get current menu categories
  const getCurrentMenuCategories = () => {
    if (!categoryMenuStack.length) return categories;
    let node = { children: categories };
    for (let i = 0; i < categoryMenuStack.length; i++) {
      const found = (node.children || []).find(c => c.name === categoryMenuStack[i]);
      if (!found) return [];
      node = found;
    }
    return node.children || [];
  };

  // Handler for clicking a category in the menu
  const handleCategoryMenuClick = (cat) => {
    const currentLevel = getCurrentMenuCategories();
    const found = currentLevel.find(c => c.name === cat);
    if (found && found.children && found.children.length) {
      setCategoryMenuStack([...categoryMenuStack, cat]);
    } else {
      // It's a leaf: apply filter
      const newSelected = [...categoryMenuStack, cat];
      setSelectedCategories(newSelected);
      setCategoryMenuOpen(false);
      setCategoryMenuStack([]);
      setPage(1);
    }
  };

  // Handler for back button in menu
  const handleCategoryMenuBack = () => {
    setCategoryMenuStack(stack => stack.slice(0, -1));
  };

  // Handler for opening menu
  const openCategoryMenu = () => setCategoryMenuOpen(true);
  // Handler for closing menu
  const closeCategoryMenu = () => {
    setCategoryMenuOpen(false);
    setCategoryMenuStack([]);
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
      <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', borderRadius: '8px 8px 0 0', maxWidth: 1024, margin: '0 auto', width: '100%' }}>
        <h1 style={{ margin: 0, textAlign: 'center', width: '100%' }}>Ersatzteil Preisrechner</h1>
      </header>
      {/* Hero/Intro Section */}
      <section className="hero-intro" style={{
        background: `linear-gradient(rgba(44, 62, 80, 0.7), rgba(44, 62, 80, 0.7)), url('https://images.unsplash.com/photo-1579412690850-bd41cd0af56d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80') no-repeat center center/cover`,
        color: 'white',
        padding: '0.8rem 1rem',
        borderRadius: '0 0 8px 8px',
        margin: '0 auto',
        maxWidth: 1024,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 2px 12px rgba(44,62,80,0.08)'
      }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 600 }}>
          Professionelle Handyreparatur in Köln
        </h2>
        <p style={{ fontSize: '0.95rem', maxWidth: 700, margin: '0 auto' }}>
          Schnell, zuverlässig und günstig. Wir reparieren Ihr Smartphone noch am selben Tag.
        </p>
      </section>
      <div className="filter-bar" style={{ position: 'relative' }}>
        {/* Hamburger button for category menu */}
        <button
          className="category-menu-btn"
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5em',
            marginRight: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: 24,
            color: 'white'
          }}
          onClick={openCategoryMenu}
          aria-label="Kategorien anzeigen"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        {/* Search input and buttons */}
        <input
          type="text"
          placeholder="Produkte suchen..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { handleSearch(e); } }}
          style={{ flex: 1, minWidth: 200, color: 'black' }}
        />
        <button type="button" onClick={handleSearch}>Suchen</button>
        {searchTerm && (
          <button type="button" onClick={handleClearSearch}>Zurücksetzen</button>
        )}
        {/* Show selected category path */}
        {selectedCategories.length > 0 && (
          <div style={{ marginLeft: 16, color: '#888', fontSize: '0.98em' }}>
            Kategorie: {selectedCategories.join(' / ')}
            <button
              style={{ marginLeft: 8, background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1em' }}
              onClick={() => setSelectedCategories([])}
              title="Kategorie zurücksetzen"
            >✕</button>
          </div>
        )}
        {/* Slide-in category menu */}
        {categoryMenuOpen && (
          <div className="category-menu-overlay" onClick={closeCategoryMenu} />
        )}
        <div
          className={`category-menu${categoryMenuOpen ? ' open' : ''}`}
          style={{
            position: 'fixed',
            top: 0,
            left: categoryMenuOpen ? 0 : '-340px',
            width: 320,
            height: '100vh',
            background: '#fff',
            boxShadow: '2px 0 16px rgba(44,62,80,0.13)',
            zIndex: 2000,
            transition: 'left 0.3s cubic-bezier(.4,0,.2,1)',
            overflowY: 'auto',
            padding: '1.5rem 1.2rem 1.2rem 1.2rem',
            borderRight: '1px solid #e0e4ea',
            display: categoryMenuOpen ? 'block' : 'none'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
            {categoryMenuStack.length > 0 && (
              <button
                onClick={handleCategoryMenuBack}
                style={{ background: 'none', border: 'none', fontSize: 22, marginRight: 8, cursor: 'pointer' }}
                aria-label="Zurück"
              >
                ←
              </button>
            )}
            <span style={{ fontWeight: 600, fontSize: '1.1em' }}>
              {categoryMenuStack.length === 0 ? 'Kategorien' : categoryMenuStack[categoryMenuStack.length - 1]}
            </span>
            <button
              onClick={closeCategoryMenu}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {getCurrentMenuCategories().map(cat => (
              <li key={cat.name} style={{ marginBottom: 8 }}>
                <button
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '1.08em',
                    color: 'var(--dark-color)',
                    padding: '0.7em 0.5em',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => handleCategoryMenuClick(cat.name)}
                >
                  <span style={{ flex: 1 }}>{cat.name}</span>
                  {cat.children && cat.children.length > 0 && (
                    <span style={{ color: '#888', fontSize: 18, marginLeft: 8 }}>→</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {categoryMenuOpen && (
          <style>{`
            .category-menu-overlay {
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(44,62,80,0.18);
              z-index: 1999;
            }
            .category-menu.open { display: block !important; }
          `}</style>
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
            <button
              className="action-btn"
              onClick={() => handleCreateOffer(product.id)}
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
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
                    {/* WhatsApp order button */}
                    <a
                      className="action-btn"
                      href={`https://wa.me/491733698233?text=${encodeURIComponent('Ich möchte ' + product.name + ' bestellen')}`}
                      target="_blank"
                      rel="noopener noreferrer"                     
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--secondary-color)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'var(--primary-color)'; }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#25D366" viewBox="0 0 24 24" style={{ marginRight: 4 }}><path d="M12.004 2.003c-5.523 0-9.997 4.474-9.997 9.997 0 1.762.464 3.484 1.345 4.997l-1.409 5.151a1 1 0 0 0 1.225 1.225l5.151-1.409a9.963 9.963 0 0 0 4.997 1.345c5.523 0 9.997-4.474 9.997-9.997s-4.474-9.997-9.997-9.997zm0 18.001a7.96 7.96 0 0 1-4.073-1.144l-.29-.172-3.057.837.837-3.057-.172-.29a7.96 7.96 0 0 1-1.144-4.073c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.425-5.842c-.242-.121-1.434-.707-1.655-.788-.221-.081-.382-.121-.543.121-.161.242-.623.788-.764.949-.141.161-.282.181-.524.06-.242-.121-1.022-.377-1.947-1.202-.72-.642-1.207-1.433-1.35-1.675-.141-.242-.015-.373.106-.494.109-.108.242-.282.363-.423.121-.141.161-.242.242-.403.081-.161.04-.302-.02-.423-.06-.121-.543-1.312-.744-1.797-.196-.471-.396-.406-.543-.414l-.463-.008c-.161 0-.423.06-.646.282-.221.221-.846.827-.846 2.017 0 1.19.866 2.341.986 2.502.121.161 1.703 2.6 4.132 3.543.578.199 1.028.317 1.379.406.579.147 1.106.126 1.523.077.465-.056 1.434-.586 1.637-1.152.202-.566.202-1.051.141-1.152-.06-.101-.221-.161-.463-.282z"/></svg>
                      Bestellen
                    </a>
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
