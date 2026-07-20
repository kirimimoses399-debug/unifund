import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="notfound-page">
      <div className="notfound-content">
        <div className="notfound-icon">
          <AlertTriangle size={64} />
        </div>
        <h1>404</h1>
        <p>Page not found</p>
        <Link to="/" className="notfound-link">
          <Home size={18} /> Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
