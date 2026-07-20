import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { Link } from 'react-router-dom';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, PiggyBank, Ticket, TrendingUp, Bell, Store
} from 'lucide-react';
import api from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { balance } = useWallet();
  const [stats, setStats] = useState({ total_spent: 0, savings: 0, vouchers: 0, unread: 0 });
  const [recentTx, setRecentTx] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [txRes, notifRes, recRes] = await Promise.all([
        api.get('/transactions?limit=5'),
        api.get('/notifications?limit=1'),
        api.get('/recommendations/spending')
      ]);
      setRecentTx(txRes.data.transactions || []);
      setStats(s => ({ ...s, unread: notifRes.data.unread_count || 0 }));
      setRecommendations(recRes.data.recommendations || []);
    } catch (err) {
      console.error('Dashboard data fetch failed');
    }
  };

  const quickActions = [
    { to: '/send', icon: ArrowUpRight, label: 'Send Money', color: '#6366f1' },
    { to: '/wallet', icon: Wallet, label: 'Top Up', color: '#10b981' },
    { to: '/pay-merchant', icon: Store, label: 'Pay Merchant', color: '#f59e0b' },
    { to: '/savings', icon: PiggyBank, label: 'Save', color: '#ec4899' },
  ];

  const formatDate = (d) => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  const formatAmount = (a) => `KSH ${Math.abs(a).toLocaleString()}`;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Hello, {user?.first_name}!</h1>
          <p>Here's your financial overview</p>
        </div>
        <div className="dashboard-balance-card">
          <div className="balance-label">Wallet Balance</div>
          <div className="balance-amount">KSH {balance.toLocaleString()}</div>
          <div className="balance-change">
            <TrendingUp size={14} /> Available for transactions
          </div>
        </div>
      </div>

      <div className="quick-actions">
        {quickActions.map((action) => (
          <Link to={action.to} key={action.label} className="quick-action" style={{ '--accent': action.color }}>
            <div className="quick-action-icon" style={{ background: `${action.color}15`, color: action.color }}>
              <action.icon size={22} />
            </div>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Recent Transactions</h3>
            <Link to="/transactions">View All</Link>
          </div>
          <div className="tx-list">
            {recentTx.length === 0 ? (
              <div className="empty-state">No transactions yet</div>
            ) : (
              recentTx.map((tx) => (
                <div key={tx.id} className="tx-item">
                  <div className={`tx-icon ${tx.type}`}>
                    {tx.type === 'deposit' ? <ArrowDownLeft size={16} /> : tx.type === 'withdrawal' ? <ArrowUpRight size={16} /> : <Store size={16} />}
                  </div>
                  <div className="tx-info">
                    <div className="tx-title">{tx.description}</div>
                    <div className="tx-date">{formatDate(tx.date)}</div>
                  </div>
                  <div className={`tx-amount ${tx.amount < 0 ? 'negative' : 'positive'}`}>
                    {tx.amount < 0 ? '-' : '+'}{formatAmount(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Smart Insights</h3>
          </div>
          <div className="insights-list">
            {recommendations.length === 0 ? (
              <div className="empty-state">No insights yet. Start making transactions!</div>
            ) : (
              recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className={`insight-item ${rec.priority}`}>
                  <div className="insight-badge">{rec.type}</div>
                  <div className="insight-title">{rec.title}</div>
                  <div className="insight-desc">{rec.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
