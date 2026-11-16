import React from 'react';
import styles from './StatCard.module.css';

const StatCard = ({ title, value, icon, trend, trendValue, color }) => {
  return (
    <div className={`${styles.card} glass`}>
      <div className={styles.header}>
        <div className={styles.icon} style={{ background: color }}>
          {icon}
        </div>
        <div className={styles.trend} style={{ color: trend === 'up' ? 'var(--success)' : 'var(--danger)' }}>
          {trend === 'up' ? '↑' : '↓'} {trendValue}%
        </div>
      </div>
      <div className={styles.content}
      
      >
        <h3 className=  {styles.title}>{title}</h3>
        <p className={styles.value}>{value}</p>
      </div>
    </div>
  );
};

export default StatCard;