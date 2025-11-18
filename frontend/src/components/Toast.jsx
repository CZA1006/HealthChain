// src/components/Toast.jsx
import React, { useEffect } from 'react';
import './Toast.css';

export default function Toast({ 
  message, 
  type = 'info',    // success | error | warning | info
  duration = 3000,
  onClose,
  position = 'top-right' // top-right | top-center | bottom-right | bottom-center
}) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose && onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`toast toast-${type} toast-${position}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      {onClose && (
        <button className="toast-close" onClick={onClose}>✕</button>
      )}
    </div>
  );
}

// Toast Container 组件
export function ToastContainer({ toasts = [], onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id || index}
          {...toast}
          onClose={() => onRemove(toast.id || index)}
        />
      ))}
    </div>
  );
}
