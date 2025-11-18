// src/components/Badge.jsx
import React from 'react';
import './Badge.css';

export default function Badge({ 
  children, 
  variant = 'default', // default | success | error | warning | info | primary
  size = 'md'          // sm | md | lg
}) {
  const classNames = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames}>
      {children}
    </span>
  );
}
