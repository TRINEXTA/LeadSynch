import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/axios";

export default function PrivateRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get("/auth/me")
      .then(() => mounted && setAuth(true))
      .catch(() => mounted && setAuth(false))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Chargement...</div>;
  if (!auth) return <Navigate to="/login" replace />;

  return children;
}
