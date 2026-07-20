import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { HandCoins, Check, X, Clock } from 'lucide-react';
import './RequestMoney.css';

const RequestMoney = () => {
  const { getRequests, sendRequest, approveRequest, rejectRequest } = useWallet();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('new');

  const fetchRequests = async () => {
    const data = await getRequests();
    setRequests(data || []);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      await sendRequest(recipient, parseFloat(amount), description);
      setMessage('Request sent successfully');
      setRecipient(''); setAmount(''); setDescription('');
      fetchRequests();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to send request');
    } finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    await approveRequest(id);
    fetchRequests();
  };

  const handleReject = async (id) => {
    await rejectRequest(id);
    fetchRequests();
  };

  const incoming = requests.filter((r) => r.recipient === user.id && r.status === 'pending');
  const sent = requests.filter((r) => r.sender === user.id);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="request-page">
      <h1 className="page-title">Request Money</h1>
      
      <div className="request-tabs">
        <button className={`request-tab ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>New Request</button>
        <button className={`request-tab ${activeTab === 'incoming' ? 'active' : ''}`} onClick={() => setActiveTab('incoming')}>Incoming ({incoming.length})</button>
        <button className={`request-tab ${activeTab === 'sent' ? 'active' : ''}`} onClick={() => setActiveTab('sent')}>Sent</button>
      </div>

      {activeTab === 'new' && (
        <div className="request-card">
          <div className="request-card-header">
            <div className="request-icon"><HandCoins size={28} /></div>
            <div><h2>Request Payment</h2><p>Ask someone to send you money</p></div>
          </div>
          <form onSubmit={handleSubmit} className="request-form">
            {message && <div className={`form-message ${message.includes('Failed') ? 'error' : 'success'}`}>{message}</div>}
            <div className="form-group">
              <label>From (Email or Username)</label>
              <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Enter payer email or username" required />
            </div>
            <div className="form-group">
              <label>Amount (KSH)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" min="1" required />
            </div>
            <div className="form-group">
              <label>Description (Optional)</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this for?" />
            </div>
            <button type="submit" className="request-btn" disabled={loading}>{loading ? 'Sending...' : 'Send Request'}</button>
          </form>
        </div>
      )}

      {activeTab === 'incoming' && (
        <div className="requests-list">
          {incoming.length === 0 ? <div className="empty-state"><Clock size={48} /><p>No incoming requests</p></div> : (
            incoming.map((r) => (
              <div key={r._id} className="request-item">
                <div className="request-item-info">
                  <div className="request-item-title">From {r.sender_name}</div>
                  <div className="request-item-meta">{r.description || 'No description'} • {formatDate(r.createdAt)}</div>
                </div>
                <div className="request-item-right">
                  <div className="request-item-amount">KSH {r.amount.toLocaleString()}</div>
                  <div className="request-actions">
                    <button className="approve-btn" onClick={() => handleApprove(r._id)}><Check size={16} /> Approve</button>
                    <button className="reject-btn" onClick={() => handleReject(r._id)}><X size={16} /> Reject</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'sent' && (
        <div className="requests-list">
          {sent.length === 0 ? <div className="empty-state"><Clock size={48} /><p>No sent requests</p></div> : (
            sent.map((r) => (
              <div key={r._id} className="request-item">
                <div className="request-item-info">
                  <div className="request-item-title">To {r.recipient_name}</div>
                  <div className="request-item-meta">{r.description || 'No description'} • {formatDate(r.createdAt)}</div>
                </div>
                <div className="request-item-right">
                  <div className="request-item-amount">KSH {r.amount.toLocaleString()}</div>
                  <div className={`request-status ${r.status}`}>{r.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RequestMoney;
