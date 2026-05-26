import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type ToastType = "success" | "error";

interface Toast {
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const removeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
  };

  const showToast = (message: string, type: ToastType) => {
    clearTimers();
    
    // Set active toast
    setToast({ message, type, exiting: false });

    // Set auto-dismiss trigger at 3000ms
    dismissTimerRef.current = setTimeout(() => {
      triggerDismiss();
    }, 3000);
  };

  const triggerDismiss = () => {
    setToast(prev => prev ? { ...prev, exiting: true } : null);
    removeTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 150); // Matches the toast-exit 150ms animation duration
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const success = (message: string) => showToast(message, "success");
  const error = (message: string) => showToast(message, "error");

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      {toast && (
        <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-float max-w-sm pointer-events-auto border transition-all ${
              toast.type === "success"
                ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]"
                : "bg-[#FEE2E2] border-[#FCA5A5] text-[#B91C1C]"
            } ${toast.exiting ? "toast-exit" : "toast-enter"}`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-current flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-current flex-shrink-0" />
            )}
            <span className="text-xs font-semibold leading-normal">{toast.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
