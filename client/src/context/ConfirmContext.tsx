import React, { createContext, useContext, useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolveRef) resolveRef(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolveRef) resolveRef(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div className="glass-card modal-content animate-fade-in" style={{ 
            padding: '32px', 
            width: '100%', 
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '16px' }}>{options.title}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>{options.message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="btn" 
                onClick={handleCancel}
                style={{ border: '1px solid var(--glass-border)', minWidth: '100px' }}
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button 
                className={`btn ${options.variant === 'danger' ? 'btn-primary' : 'btn-primary'}`}
                style={{ 
                  background: options.variant === 'danger' ? 'var(--error)' : undefined,
                  minWidth: '100px'
                }}
                onClick={handleConfirm}
              >
                {options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
