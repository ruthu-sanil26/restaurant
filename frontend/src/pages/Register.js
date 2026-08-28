import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Register() {
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('receptionist');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(idNumber, email, password, role);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Royal Rasoi</h1>
        <p className={styles.subtitle}>Create an account</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <input
            type="text"
            name="idNumber"
            placeholder="ID Number"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            required
            className={styles.input}
            autoComplete="new-password"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
            autoComplete="off"
          />
          <input
            type="password"
            name="password"
            placeholder="Password (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={styles.input}
            autoComplete="new-password"
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className={styles.input}>
            <option value="receptionist">Receptionist</option>
            <option value="waiter">Waiter</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className={styles.button}>
            Register
          </button>
        </form>
        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
