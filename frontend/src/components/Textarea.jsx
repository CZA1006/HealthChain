// src/components/Textarea.jsx
import React from 'react';
import './Textarea.css';

export default function Textarea({
  label,
  error,
  helperText,
  fullWidth = false,
  rows = 4,
  ...props
}) {
  const textareaClassNames = [
    'textarea',
    error && 'textarea-error',
    fullWidth && 'textarea-full-width'
  ].filter(Boolean).join(' ');

  return (
    <div className={`textarea-wrapper ${fullWidth ? 'textarea-wrapper-full-width' : ''}`}>
      {label && (
        <label className="textarea-label">
          {label}
          {props.required && <span className="textarea-required">*</span>}
        </label>
      )}
      
      <textarea
        className={textareaClassNames}
        rows={rows}
        {...props}
      />
      
      {error && <p className="textarea-error-text">{error}</p>}
      {helperText && !error && <p className="textarea-helper-text">{helperText}</p>}
    </div>
  );
}
