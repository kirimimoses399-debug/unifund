import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import WalletPage from './pages/Wallet/Wallet';
import SendMoney from './pages/SendMoney/SendMoney';
import RequestMoney from './pages/RequestMoney/RequestMoney';
import Transactions from './pages/Transactions/Transactions';
import Profile from './pages/Profile/Profile';
import NotFound from './pages/NotFound/NotFound';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="send" element={<SendMoney />} />
              <Route path="request" element={<RequestMoney />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
