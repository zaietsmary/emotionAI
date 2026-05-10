import React from 'react';
import styles from './Header.module.css';

const Header = ({ isSystemActive }) => {
  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <div className={styles.icon}>-</div>
        <h1 className={styles.title}>EmotionAI <span className={styles.subtitle}>Dashboard</span></h1>
      </div>
      
      <nav className={styles.nav}>
        <div className={styles.statusBadge}>
          <span className={`${styles.statusDot} ${isSystemActive ? styles.active : styles.inactive}`}></span>
          {isSystemActive ? 'Система активна' : 'Система очікує'}
        </div>
      </nav>
    </header>
  );
};

export default Header;