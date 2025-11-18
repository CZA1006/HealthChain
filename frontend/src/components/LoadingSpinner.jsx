// src/components/LoadingSpinner.jsx
import React from 'react';
import './LoadingSpinner.css';

export default function LoadingSpinner({ 
  size = 'md',        // sm | md | lg
  variant = 'primary', // primary | secondary | white
  text,
  fullScreen = false 
}) {
  const spinnerClassNames = [
    'spinner',
    `spinner-${size}`,
    `spinner-${variant}`
  ].filter(Boolean).join(' ');

  const content = (
    <div className="spinner-container">
      <div className={spinnerClassNames}></div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="spinner-fullscreen">
        {content}
      </div>
    );
  }

  return content;
}
