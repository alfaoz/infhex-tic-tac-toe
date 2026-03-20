import { Navigate, Outlet, Route, Routes } from 'react-router'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import LiveGameRuntime from './components/LiveGameRuntime'
import FinishedGameRoute from './routes/FinishedGameRoute'
import FinishedGamesRoute from './routes/FinishedGamesRoute'
import AdminRoute from './routes/AdminRoute'
import AdminControlsRoute from './routes/AdminControlsRoute'
import LeaderboardRoute from './routes/LeaderboardRoute'
import LobbyRoute from './routes/LobbyRoute'
import SessionRoute from './routes/SessionRoute'

function AppLayout() {
  return (
    <>
      <LiveGameRuntime />
      <Outlet />
      <ToastContainer
        position="top-right"
        autoClose={4000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
      />
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LobbyRoute />} />
        <Route path="/session/:sessionId" element={<SessionRoute />} />
        <Route path="/games" element={<FinishedGamesRoute />} />
        <Route path="/games/:gameId" element={<FinishedGameRoute />} />
        <Route path="/account/games" element={<FinishedGamesRoute />} />
        <Route path="/account/games/:gameId" element={<FinishedGameRoute />} />
        <Route path="/leaderboard" element={<LeaderboardRoute />} />
        <Route path="/admin" element={<AdminControlsRoute />} />
        <Route path="/admin/stats" element={<AdminRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
