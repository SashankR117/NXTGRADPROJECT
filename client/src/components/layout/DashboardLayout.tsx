import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Layers, Lightbulb, Globe, Search,
  TrendingUp, Users, MessageSquare, Activity, Sparkles, FileText,
  Github, ExternalLink
} from 'lucide-react'

const navItems = [
  { label: 'Analytics', items: [
    { to: '/overview', icon: LayoutDashboard, label: 'Overview' },
    { to: '/themes', icon: Layers, label: 'Themes', badge: '9' },
    { to: '/insights', icon: Lightbulb, label: 'Insights' },
    { to: '/sources', icon: Globe, label: 'Sources' },
    { to: '/reports', icon: FileText, label: 'Reports & Export' },
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
      '/reports': { title: 'Reports & Data Hub', subtitle: 'Export collected feedback data and AI insights in CSV & JSON' },
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

        <div className="sidebar-footer">
          <a
            href="https://github.com/SashankR117/NXTGRADPROJECT"
            target="_blank"
            rel="noopener noreferrer"
            className="github-sidebar-btn"
            title="Open GitHub Repository"
          >
            <Github size={18} />
            <span>GitHub Repo</span>
            <ExternalLink size={14} className="github-external-icon" />
          </a>
        </div>
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
            <a
              href="https://github.com/SashankR117/NXTGRADPROJECT"
              target="_blank"
              rel="noopener noreferrer"
              className="github-header-btn"
              title="View Source on GitHub"
            >
              <Github size={18} />
              <span>GitHub</span>
            </a>
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
