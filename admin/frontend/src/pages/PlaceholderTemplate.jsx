import React from 'react';
import styles from './Placeholder.module.css';

const Placeholder = ({ title }) => {
  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">This module is currently under migration.</p>
      </div>
      
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚧</div>
        <h2>Coming Soon</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
          We are working on bringing the {title} module from the legacy system to this new premium dashboard.
        </p>
      </div>
    </div>
  );
};

export default Placeholder;
