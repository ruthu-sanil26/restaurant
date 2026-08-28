import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  try {
    await login(email, password);

    // Redirect to admin Dashboard after login
    navigate('/admin', { replace: true });
  } catch (err) {
    const msg = err.response?.data?.message;
    const isNetwork = !err.response && (err.message === 'Network Error' || err.code === 'ERR_NETWORK');
    setError(
      msg || (isNetwork ? 'Cannot reach server. Start the backend (npm run dev in backend folder) and try again.' : 'Login failed')
    );
  }
};

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Royal Rasoi</h1>
        <p className={styles.subtitle}>Sign in to manage your restaurant</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Sign In
          </button>
        </form>
        <p className={styles.footer}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
