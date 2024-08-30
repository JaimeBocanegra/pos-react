// ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../Pages/Auth/useAuth";

const ProtectedRoute = () => {
  const { session, loading } = useAuth();

  if (loading) return <div>Loading...</div>; // Mostrar un estado de carga mientras se verifica la sesión

  return session ? <Outlet /> : <Navigate to="/Login" />;
};

export default ProtectedRoute;
