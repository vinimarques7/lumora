import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import DeckPage from '@/pages/DeckPage'
import HoldAndAnswerGame from '@/pages/HoldAndAnswerGame'
import QuizGame from '@/pages/QuizGame'
import Profile from '@/pages/Profile'
import AdminPage from '@/pages/AdminPage'
import Explore from '@/pages/Explore'

function NotFound() {
  return (
    <div className="container py-24 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground mt-2">Página não encontrada.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/explore" element={<Explore />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/decks/:id" element={<DeckPage />} />
              <Route path="/decks/:id/play/hold" element={<HoldAndAnswerGame />} />
              <Route path="/decks/:id/play/quiz" element={<QuizGame />} />
              <Route path="/play/hold" element={<HoldAndAnswerGame />} />
              <Route path="/play/quiz" element={<QuizGame />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/home" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
