import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchTransactions();
    }
  }, [user]);

  const fetchBalance = async () => {
    try {
      const res = await api.get('/wallet');
      setBalance(res.data.balance);
    } catch (err) {
      console.error('Failed to fetch balance');
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error('Failed to fetch transactions');
    }
  };

  const deposit = async (amount) => {
    const res = await api.post('/wallet/deposit', { amount });
    await fetchBalance();
    await fetchTransactions();
    return res.data;
  };

  const withdraw = async (amount) => {
    const res = await api.post('/wallet/withdraw', { amount });
    await fetchBalance();
    await fetchTransactions();
    return res.data;
  };

  const send = async (recipient, amount, description) => {
    const res = await api.post('/wallet/send', { recipient, amount, description });
    await fetchBalance();
    await fetchTransactions();
    return res.data;
  };

  const payMerchant = async (merchantId, amount, couponCode) => {
    const res = await api.post('/wallet/pay', { merchant_id: merchantId, amount, coupon_code: couponCode });
    await fetchBalance();
    await fetchTransactions();
    return res.data;
  };

  const value = { balance, transactions, deposit, withdraw, send, payMerchant, fetchBalance, fetchTransactions };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => useContext(WalletContext);
