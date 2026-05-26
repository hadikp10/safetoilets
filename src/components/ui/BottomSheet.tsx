import React, { useState, useEffect } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsExiting(false);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 200); // matches the transition timing
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/5 z-[100] transition-opacity duration-200 ${
          isExiting ? "opacity-0" : "backdrop-enter opacity-100"
        }`}
        onClick={handleClose}
      />

      {/* Peek Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[110] bg-white rounded-t-[20px] shadow-lg max-h-[80vh] overflow-y-auto no-scrollbar pb-[max(16px,env(safe-area-inset-bottom))] flex flex-col border-t border-[#E9E9E7] max-w-md mx-auto ${
          isExiting ? "sheet-exit" : "sheet-enter"
        }`}
      >
        {/* Drag handle */}
        <div 
          className="w-7 h-[3px] bg-[#D3D3CF] rounded-full mx-auto mt-2.5 mb-3 flex-shrink-0 cursor-pointer" 
          onClick={handleClose} 
        />

        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between border-b border-[#E9E9E7]">
          <h3 className="text-[16px] font-semibold text-[#191919]">{title}</h3>
          <button
            onClick={handleClose}
            className="text-[#6B6B6B] hover:text-[#191919] text-[13px] font-medium min-h-[36px]"
          >
            Cancel
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </>
  );
}
