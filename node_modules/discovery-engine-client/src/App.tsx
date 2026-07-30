import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './components/layout/DashboardLayout'
import Overview from './pages/Overview'
import Themes from './pages/Themes'
import Insights from './pages/Insights'
import Sources from './pages/Sources'
import Explorer from './pages/Explorer'
import Trends from './pages/Trends'
import Segments from './pages/Segments'
import Chat from './pages/Chat'
import Pipeline from './pages/Pipeline'

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/themes" element={<Themes />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/segments" element={<Segments />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/pipeline" element={<Pipeline />} />
      </Route>
    </Routes>
  )
}
