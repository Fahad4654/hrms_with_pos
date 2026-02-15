import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Listen for custom 'show-toast' events (for non-React files like api.ts)
  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      showToast(customEvent.detail.message, customEvent.detail.type);
    };

    window.addEventListener('show-toast', handleCustomToast);
    return () => window.removeEventListener('show-toast', handleCustomToast);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} className="animate-fade-in glass-card" style={{
            padding: '16px 24px',
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                       toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 
                       toast.type === 'warning' ? 'rgba(245, 158, 11, 0.9)' : 
                       'rgba(59, 130, 246, 0.9)',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            minWidth: '300px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer'
          }} onClick={() => removeToast(toast.id)}>
            <span style={{ fontWeight: 500 }}>{toast.message}</span>
            <span style={{ fontSize: '1.25rem', marginLeft: '12px' }}>&times;</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
