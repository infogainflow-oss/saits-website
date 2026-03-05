import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './components/Auth/Login'
import ResetPassword from './components/Auth/ResetPassword'
import DashboardHome from './components/Dashboard/DashboardHome'
import './App.css'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <DashboardHome /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" replace />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
      </Routes>
    </Router>
  )
}

export default App
