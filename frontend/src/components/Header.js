import React from "react";
import { Link, NavLink } from "react-router-dom";
import styles from "./Header.module.css";

function Header() {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logoLink}>
        <h2 className={styles.logo}>
          <span>👑</span> Royal Rasoi
        </h2>
      </Link>

      <nav className={styles.navLinks}>
        <NavLink to="/" className={({ isActive }) => (isActive ? styles.active : "")} end>
          Home
        </NavLink>
        <NavLink to="/menulayout" className={({ isActive }) => (isActive ? styles.active : "")}>
          Menu
        </NavLink>
        <NavLink to="/reserve" className={({ isActive }) => (isActive ? styles.active : "")}>
          Book Table
        </NavLink>
      </nav>

      <div className={styles.actions}>
        <Link to="/login">
          <button className={styles.loginBtn}>🔑 Admin Login</button>
        </Link>
      </div>
    </header>
  );
}

export default Header;