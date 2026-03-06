import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import { useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Study from "./pages/Study";

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <div className="text-sm text-slate-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />

        <Route
          path="/"
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="library" element={<Library />} />
          <Route path="study/:deckId" element={<Study />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
