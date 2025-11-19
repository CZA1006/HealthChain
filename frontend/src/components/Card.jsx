// src/components/Card.jsx - 深色主题优化版
import React from 'react';
import './Card.css';

export default function Card({ 
  children, 
  title,
  subtitle,
  footer,
  variant = 'elevated', // default | outlined | elevated（默认改为 elevated）
  padding = 'md',       // sm | md | lg
  hoverable = false,
  className = '',
  ...props 
}) {
  const classNames = [
    'card',
    `card-${variant}`,
    `card-padding-${padding}`,
    hoverable && 'card-hoverable',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...props}>
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}
      
      <div className="card-body">
        {children}
      </div>
      
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
}
