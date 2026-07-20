import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowDownLeft, ArrowUpRight, Send, ArrowLeftRight, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import './Transactions.css';

const Transactions = () => {
  const { transactions, getTransactions } = useWallet();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      await getTransactions();
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = transactions.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return t.sender === user.id;
    if (filter === 'received') return t.recipient === user.id;
    if (filter === 'deposit') return t.type === 'deposit';
    if (filter === 'withdraw') return t.type === 'withdraw';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft size={18} />;
      case 'withdraw': return <ArrowUpRight size={18} />;
      case 'transfer': return <ArrowLeftRight size={18} />;
      default: return <Send size={18} />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} color="#34d399" />;
      case 'pending': return <Clock size={16} color="#f59e0b" />;
      case 'failed': return <XCircle size={16} color="#ef4444" />;
      default: return <Clock size={16} />;
    }
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="transactions-page">
      <div className="transactions-header">
        <h1 className="page-title">Transaction History</h1>
        <div className="filter-tabs">
          {['all', 'sent', 'received', 'deposit', 'withdraw'].map((f) => (
            <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="transactions-list">
        {loading ? (
          <div className="loading">Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} />
            <p>No transactions found</p>
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t._id} className="transaction-item">
              <div className={`transaction-icon ${t.type}`}>{getIcon(t.type)}</div>
              <div className="transaction-info">
                <div className="transaction-title">
                  {t.type === 'transfer' ? (t.sender === user.id ? 'Sent to ' + t.recipient_name : 'Received from ' + t.sender_name) : t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                </div>
                <div className="transaction-meta">{t.description || 'No description'} • {formatDate(t.createdAt)}</div>
              </div>
              <div className="transaction-right">
                <div className={`transaction-amount ${t.sender === user.id ? 'negative' : 'positive'}`}>
                  {t.sender === user.id ? '-' : '+'} KSH {t.amount.toLocaleString()}
                </div>
                <div className="transaction-status">{getStatusIcon(t.status)} {t.status}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Transactions;
