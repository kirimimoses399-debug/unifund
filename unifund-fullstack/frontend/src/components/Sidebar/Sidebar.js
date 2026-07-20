import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Wallet, Send, Receipt, PiggyBank, Ticket, BarChart3, Store,
  Bell, User, Settings, LogOut, ChevronLeft, ChevronRight, Shield
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const mainLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/send', icon: Send, label: 'Send Money' },
    { to: '/transactions', icon: Receipt, label: 'Transactions' },
    { to: '/savings', icon: PiggyBank, label: 'Savings Goals' },
    { to: '/vouchers', icon: Ticket, label: 'Vouchers' },
    { to: '/budget', icon: BarChart3, label: 'Budget' },
    { to: '/pay-merchant', icon: Store, label: 'Pay Merchant' },
  ];

  const adminLinks = [
    { to: '/admin', icon: Shield, label: 'Admin Dashboard' },
    { to: '/admin/users', icon: User, label: 'Manage Users' },
    { to: '/admin/transactions', icon: Receipt, label: 'All Transactions' },
    { to: '/admin/vouchers', icon: Ticket, label: 'Manage Vouchers' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/notifications', icon: Bell, label: 'Send Notifications' },
  ];

  const bottomLinks = [
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const renderLink = (link) => (
    <NavLink
      key={link.to}
      to={link.to}
      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
    >
      <link.icon size={20} />
      {!collapsed && <span>{link.label}</span>}
    </NavLink>
  );

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">UF</div>
          {!collapsed && <span className="logo-text">UniFund</span>}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          {!collapsed && <div className="section-label">Main</div>}
          {mainLinks.map(renderLink)}
        </div>

        {isAdmin && (
          <div className="nav-section">
            {!collapsed && <div className="section-label">Admin</div>}
            {adminLinks.map(renderLink)}
          </div>
        )}

        <div className="nav-section">
          {!collapsed && <div className="section-label">Account</div>}
          {bottomLinks.map(renderLink)}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
        {!collapsed && user && (
          <div className="user-mini">
            <div className="user-avatar">{user.first_name?.[0]}{user.last_name?.[0]}</div>
            <div className="user-info">
              <div className="user-name">{user.first_name} {user.last_name}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
