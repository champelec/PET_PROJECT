import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { authStore } from '../stores/authStore';

export const ProtectedRoute = observer(() => {
  const location = useLocation();

  if (!authStore.isAuth) {
    const currentPath = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${currentPath}`} replace />;
  }

  return <Outlet />;
});
