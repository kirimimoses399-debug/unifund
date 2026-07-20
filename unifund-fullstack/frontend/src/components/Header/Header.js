import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, Search, Menu } from 'lucide-react';
import './Header.css';

const Header = () => {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="mobile-menu-btn">
          <Menu size={20} />
        </button>
        <div className={`search-bar ${searchOpen ? 'open' : ''}`}>
          <Search size={16} />
          <input type="text" placeholder="Search..." />
        </div>
      </div>
      <div className="header-right">
        <button className="icon-btn" onClick={() => setSearchOpen(!searchOpen)}>
          <Search size={18} />
        </button>
        <button className="icon-btn notification-btn">
          <Bell size={18} />
          <span className="badge">3</span>
        </button>
        <div className="header-user">
          <div className="header-avatar">{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
          <div className="header-user-info">
            <div className="header-name">{user?.first_name} {user?.last_name}</div>
            <div className="header-email">{user?.email}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
