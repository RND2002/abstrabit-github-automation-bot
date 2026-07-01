import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppDispatch } from './store/hooks';
import { fetchUser, setUnauthorized } from './store/authSlice';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
 
import { RepoDetails } from './pages/RepoDetails';
 
function App() {
  const dispatch = useAppDispatch();
 
  useEffect(() => {
    // Initial fetch to check auth status
    dispatch(fetchUser());

    // Listen for unauthorized events from axios interceptor
    const handleUnauthorized = () => {
      dispatch(setUnauthorized());
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/repo/:repoId" element={<RepoDetails />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
