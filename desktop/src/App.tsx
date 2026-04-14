import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./contexts/AuthContext";

const Layout = lazy(() => import("./components/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DeckSettings = lazy(() => import("./pages/DeckSettings"));
const GoogleCallback = lazy(() => import("./pages/GoogleCallback"));
const Library = lazy(() => import("./pages/Library"));
const Login = lazy(() => import("./pages/Login"));
const Messages = lazy(() => import("./pages/Messages"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportsExercises = lazy(() => import("./pages/ReportsExercises"));
const ReportsOverview = lazy(() => import("./pages/ReportsOverview"));
const Retention = lazy(() => import("./pages/Retention"));
const Social = lazy(() => import("./pages/Social"));
const Streak = lazy(() => import("./pages/Streak"));
const Study = lazy(() => import("./pages/Study"));

const RouteFallback: React.FC = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
    <div className="text-sm text-slate-400">Đang tải giao diện...</div>
  </div>
);

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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
            <Route index element={<Dashboard />} />
            <Route path="library" element={<Library />} />
            <Route path="social" element={<Social />} />
            <Route path="messages" element={<Messages />} />
            <Route path="study/:deckId" element={<Study />} />
            <Route path="decks/:deckId/settings" element={<DeckSettings />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/overview" element={<ReportsOverview />} />
            <Route path="reports/exercises" element={<ReportsExercises />} />
            <Route path="retention" element={<Retention />} />
            <Route path="streak" element={<Streak />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/:userId" element={<PublicProfile />} />
          </Route>

          <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
