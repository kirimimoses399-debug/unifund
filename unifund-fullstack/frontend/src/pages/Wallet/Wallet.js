import React, { useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { Wallet, ArrowDownLeft, ArrowUpRight, CreditCard } from 'lucide-react';
import './Wallet.css';

const WalletPage = () => {
  const { balance, deposit, withdraw } = useWallet();
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState('deposit');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const amt = parseFloat(amount);
      if (amt <= 0) { setMessage('Amount must be positive'); return; }
      if (action === 'deposit') {
        await deposit(amt);
        setMessage(`Successfully deposited KSH ${amt.toLocaleString()}`);
      } else {
        await withdraw(amt);
        setMessage(`Successfully withdrawn KSH ${amt.toLocaleString()}`);
      }
      setAmount('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-page">
      <h1 className="page-title">My Wallet</h1>
      
      <div className="wallet-card">
        <div className="wallet-card-header">
          <div>
            <div className="wallet-label">Available Balance</div>
            <div className="wallet-balance">KSH {balance.toLocaleString()}</div>
          </div>
          <div className="wallet-icon">
            <Wallet size={32} />
          </div>
        </div>
        <div className="wallet-card-footer">
          <div className="wallet-stat">
            <span className="wallet-stat-label">Status</span>
            <span className="wallet-stat-value active">Active</span>
          </div>
          <div className="wallet-stat">
            <span className="wallet-stat-label">Currency</span>
            <span className="wallet-stat-value">KSH</span>
          </div>
        </div>
      </div>

      <div className="wallet-actions">
        <div className="action-tabs">
          <button className={`action-tab ${action === 'deposit' ? 'active' : ''}`} onClick={() => setAction('deposit')}>
            <ArrowDownLeft size={18} /> Deposit
          </button>
          <button className={`action-tab ${action === 'withdraw' ? 'active' : ''}`} onClick={() => setAction('withdraw')}>
            <ArrowUpRight size={18} /> Withdraw
          </button>
        </div>

        <form onSubmit={handleSubmit} className="wallet-form">
          {message && <div className={`form-message ${message.includes('failed') || message.includes('must') || message.includes('Insufficient') ? 'error' : 'success'}`}>{message}</div>}
          <div className="form-group">
            <label>Amount (KSH)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
              required
            />
          </div>
          <button type="submit" className="wallet-submit" disabled={loading}>
            {loading ? 'Processing...' : action === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WalletPage;
