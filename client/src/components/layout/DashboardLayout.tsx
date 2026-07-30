import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Layers, Lightbulb, Globe, Search,
  TrendingUp, Users, MessageSquare, Activity, Sparkles
} from 'lucide-react'

const navItems = [
  { label: 'Analytics', items: [
    { to: '/overview', icon: LayoutDashboard, label: 'Overview' },
    { to: '/themes', icon: Layers, label: 'Themes', badge: '9' },
    { to: '/insights', icon: Lightbulb, label: 'Insights' },
    { to: '/sources', icon: Globe, label: 'Sources' },
  ]},
  { label: 'Explore', items: [
    { to: '/explorer', icon: Search, label: 'Explorer' },
    { to: '/trends', icon: TrendingUp, label: 'Trends' },
    { to: '/segments', icon: Users, label: 'Segments' },
  ]},
  { label: 'AI', items: [
    { to: '/chat', icon: MessageSquare, label: 'Ask AI', badge: 'NEW' },
  ]},
  { label: 'System', items: [
    { to: '/pipeline', icon: Activity, label: 'Pipeline' },
  ]},
];

export function DashboardLayout() {
  const location = useLocation();

  const getPageTitle = () => {
    const titles: Record<string, { title: string; subtitle: string }> = {
      '/overview': { title: 'Overview', subtitle: 'Real-time user feedback intelligence' },
      '/themes': { title: 'Theme Explorer', subtitle: 'Discover patterns in user feedback' },
      '/insights': { title: 'Insights', subtitle: 'AI-generated strategic recommendations' },
      '/sources': { title: 'Source Analysis', subtitle: 'Per-platform feedback breakdown' },
      '/explorer': { title: 'Document Explorer', subtitle: 'Search and analyze raw feedback' },
      '/trends': { title: 'Trend Analysis', subtitle: 'Track evolving themes over time' },
      '/segments': { title: 'User Segments', subtitle: 'Behavioral segment analysis' },
      '/chat': { title: 'Ask AI', subtitle: 'Chat with the Discovery Engine' },
      '/pipeline': { title: 'Pipeline Health', subtitle: 'System monitoring and status' },
    };
    return titles[location.pathname] || { title: 'Dashboard', subtitle: '' };
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Sparkles size={20} color="white" />
          </div>
          <div className="sidebar-logo-text">
            <h1>Discovery Engine</h1>
            <span>AI-Powered Analytics</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        <header className="header">
          <div className="header-left">
            <div>
              <div className="header-title">{title}</div>
              <div className="header-subtitle">{subtitle}</div>
            </div>
          </div>
          <div className="header-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="status-dot active" style={{ animation: 'pulse-glow 2s infinite' }} />
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Live</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
