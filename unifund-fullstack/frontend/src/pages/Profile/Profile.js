import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, Shield, Save, AlertTriangle } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({
        fullName: form.fullName,
        phone: form.phone,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined
      });
      setMessage('Profile updated successfully');
      setForm({ ...form, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMessage(err.response?.data?.error || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="profile-page">
      <h1 className="page-title">Profile</h1>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            <User size={32} />
          </div>
          <div>
            <div className="profile-name">{user?.fullName || 'User'}</div>
            <div className="profile-email">{user?.email}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          {message && <div className={`form-message ${message.includes('failed') || message.includes('match') ? 'error' : 'success'}`}>{message}</div>}
          
          <div className="form-section">
            <h3><User size={16} /> Personal Information</h3>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="fullName" value={form.fullName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={user?.email} disabled />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-with-icon">
                <Phone size={18} />
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+254 712 345 678" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3><Shield size={16} /> Security</h3>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} placeholder="Leave blank to keep unchanged" />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} />
            </div>
          </div>

          <button type="submit" className="profile-submit" disabled={loading}>
            <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
