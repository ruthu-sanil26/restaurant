import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OrderBell from './OrderBell';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>◆</span>
          <span>Royal Rasoi</span>
          <div className={styles.bellWrap}>
            <OrderBell />
          </div>
        </div>
        <nav className={styles.nav}>
  <NavLink to="/admin" className={({ isActive }) => (isActive ? styles.navActive : '')} end>
    Dashboard
  </NavLink>
  <NavLink to="/admin/menu" className={({ isActive }) => (isActive ? styles.navActive : '')}>
    Menu
  </NavLink>
  <NavLink to="/admin/orders" className={({ isActive }) => (isActive ? styles.navActive : '')}>
    Orders
  </NavLink>
  <NavLink to="/admin/reservations" className={({ isActive }) => (isActive ? styles.navActive : '')}>
    Reservations
  </NavLink>
  <NavLink to="/admin/tables" className={({ isActive }) => (isActive ? styles.navActive : '')}>
    Tables
  </NavLink>
  {user?.role === 'admin' && (
    <NavLink to="/admin/analytics" className={({ isActive }) => (isActive ? styles.navActive : '')}>
      Analytics
    </NavLink>
  )}
  {user?.role === 'admin' && (
    <NavLink to="/admin/staff" className={({ isActive }) => (isActive ? styles.navActive : '')}>
      Staff
    </NavLink>
  )}
  {user?.role === 'admin' && (
    <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? styles.navActive : '')}>
      Settings
    </NavLink>
  )}
</nav>
        <div className={styles.user}>
          <span className={styles.userName}>{user?.idNumber}</span>
          <span className={styles.userRole}>{user?.role}</span>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
