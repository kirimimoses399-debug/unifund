import React, { useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { Send, User, MessageSquare } from 'lucide-react';
import './SendMoney.css';

const SendMoney = () => {
  const { send } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      await send(recipient, parseFloat(amount), description);
      setMessage(`Sent KSH ${parseFloat(amount).toLocaleString()} to ${recipient}`);
      setRecipient('');
      setAmount('');
      setDescription('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="send-page">
      <h1 className="page-title">Send Money</h1>
      
      <div className="send-card">
        <div className="send-card-header">
          <div className="send-icon">
            <Send size={28} />
          </div>
          <div>
            <h2>Transfer Funds</h2>
            <p>Send money to another UniFund user</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="send-form">
          {message && <div className={`form-message ${message.includes('failed') ? 'error' : 'success'}`}>{message}</div>}
          
          <div className="form-group">
            <label>Recipient (Email or Username)</label>
            <div className="input-with-icon">
              <User size={18} />
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter recipient email or username"
                required
              />
            </div>
          </div>

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

          <div className="form-group">
            <label>Description (Optional)</label>
            <div className="input-with-icon">
              <MessageSquare size={18} />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this for?"
              />
            </div>
          </div>

          <button type="submit" className="send-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Money'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SendMoney;
