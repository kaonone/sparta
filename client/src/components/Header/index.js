import React from 'react';
import styles from './header.module.scss';
import logo from './stater-kits-logo.png';

const Header = () => (
  <div className={styles.header}>
    <nav id="menu" className="menu">
      <div className={styles.brand}>
        <a href="/" className={styles.link}>
          <img src={logo} alt="logo" />
        </a>
      </div>
    </nav>
  </div>
);

export default Header;
