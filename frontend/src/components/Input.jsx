// src/components/Input.jsx
import React from 'react';
import './Input.css';

export default function Input({
  label,
  error,
  helperText,
  fullWidth = false,
  icon,
  type = 'text',
  ...props
}) {
  const inputClassNames = [
    'input',
    error && 'input-error',
    icon && 'input-with-icon',
    fullWidth && 'input-full-width'
  ].filter(Boolean).join(' ');

  return (
    <div className={`input-wrapper ${fullWidth ? 'input-wrapper-full-width' : ''}`}>
      {label && (
        <label className="input-label">
          {label}
          {props.required && <span className="input-required">*</span>}
        </label>
      )}
      
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          type={type}
          className={inputClassNames}
          {...props}
        />
      </div>
      
      {error && <p className="input-error-text">{error}</p>}
      {helperText && !error && <p className="input-helper-text">{helperText}</p>}
    </div>
  );
}
