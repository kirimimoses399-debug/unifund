import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '',
    student_id: '', institution: '', course: '', year_of_study: '', date_of_birth: '',
    address: '', city: '', postal_code: '', country: 'Kenya'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card wide">
        <div className="auth-header">
          <div className="auth-logo">UF</div>
          <h1>Create Account</h1>
          <p>Join UniFund and start managing your finances</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <div className="input-with-icon">
                <User size={18} />
                <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="First name" required />
              </div>
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <div className="input-with-icon">
                <User size={18} />
                <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last name" required />
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email address" required />
              </div>
            </div>
            <div className="form-group">
              <label>Phone</label>
              <div className="input-with-icon">
                <Phone size={18} />
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" required />
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Student ID</label>
              <input name="student_id" value={form.student_id} onChange={handleChange} placeholder="Student ID" required />
            </div>
            <div className="form-group">
              <label>Institution</label>
              <input name="institution" value={form.institution} onChange={handleChange} placeholder="University/College" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Course</label>
              <input name="course" value={form.course} onChange={handleChange} placeholder="Course of study" required />
            </div>
            <div className="form-group">
              <label>Year of Study</label>
              <input type="number" name="year_of_study" value={form.year_of_study} onChange={handleChange} placeholder="Year" min="1" max="6" required />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="Create password" required />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input type="password" name="confirm_password" value={form.confirm_password} onChange={handleChange} placeholder="Confirm password" required />
            </div>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
