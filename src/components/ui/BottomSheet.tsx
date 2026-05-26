import React from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      {/* Backdrop Click Dismiss */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      
      {/* Drawer Container */}
      <div className="w-full max-w-md bg-surface-card dark:bg-dark-card rounded-t-[28px] border-t border-surface-border dark:border-dark-border shadow-2xl relative z-10 animate-slide-up pb-[env(safe-area-inset-bottom)]">
        {/* iOS-Style Drag Handle */}
        <div className="w-9 h-1.5 bg-surface-border dark:bg-dark-border rounded-full mx-auto my-3" />
        
        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between border-b border-surface-border dark:border-dark-border">
          <h3 className="text-base font-semibold text-text-primary dark:text-text-inverse">{title}</h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary dark:hover:text-text-inverse min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-medium"
          >
            Cancel
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto max-h-[60vh] no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
