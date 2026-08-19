import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Products } from './pages/Products';
import { ProductSidebar } from './pages/ProductSidebar';
import { ProductForm } from './pages/ProductForm';
import { ErrorBoundary } from './components/ErrorBoundary';

const NotFound = () => <h1>404 - Страница не найдена</h1>;

function App() {
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    
    document.body.style.backgroundColor = isDarkMode ? '#141414' : '#ffffff';
    document.body.style.color = isDarkMode ? '#ffffff' : '#000000';
    document.body.style.margin = '0';

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isDarkMode]);

  return (
    <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/products" replace />} />
              
              <Route path="/products" element={<Products />}>
                <Route path=":productId" element={<ProductSidebar />} />
              </Route>

              <Route path="/products/new" element={<ProductForm />} />
              <Route path="/products/:productId/edit" element={<ProductForm />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;