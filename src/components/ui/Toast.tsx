import React, { useEffect } from 'react';
import { X, Check, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: (id: string) => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const icons = {
        success: <Check className="w-5 h-5 text-emerald-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
    };

    const bgColors = {
        success: 'bg-white dark:bg-dark-surface border-emerald-500/20',
        error: 'bg-white dark:bg-dark-surface border-red-500/20',
        info: 'bg-white dark:bg-dark-surface border-blue-500/20',
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-black/5 animate-slideInRight ${bgColors[type]}`}>
            {icons[type]}
            <p className="text-sm font-medium text-light-text dark:text-dark-text">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
                <X className="w-4 h-4 text-light-text-muted dark:text-dark-text-muted" />
            </button>
        </div>
    );
};

export default Toast;
