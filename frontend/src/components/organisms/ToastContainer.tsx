import React from 'react';
import { useToastStore } from '../../stores/toastStore';
import { Toast } from '../molecules/Toast';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="알림"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4"
    >
      {toasts.map((item) => (
        <Toast key={item.id} toast={item} onClose={removeToast} />
      ))}
    </div>
  );
};
