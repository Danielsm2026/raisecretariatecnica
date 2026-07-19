import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = true,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div id="confirmation-modal-overlay" className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl relative z-50 overflow-hidden"
          >
            {/* Visual indicator stripe */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${isDanger ? 'bg-red-500' : 'bg-blue-500'}`} />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4.5 right-4.5 text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition"
              title="Cerrar confirmación"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content area */}
            <div className="flex gap-4 mt-2">
              <div className={`p-3 rounded-lg self-start shrink-0 ${isDanger ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                <AlertTriangle className="w-5.5 h-5.5" />
              </div>

              <div className="space-y-1.5 flex-grow pr-4">
                <h3 className="text-sm font-bold font-display text-white tracking-widest uppercase">
                  {title}
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {message}
                </p>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3.5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-[10px] font-mono font-bold tracking-wider uppercase text-slate-450 hover:text-white bg-slate-800/50 hover:bg-slate-850 rounded border border-slate-800/60 transition cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-4 py-1.5 text-[10px] font-mono font-bold tracking-wider uppercase text-white rounded transition flex items-center gap-1.5 cursor-pointer ${
                  isDanger
                    ? 'bg-red-500 hover:bg-red-650 shadow-lg shadow-red-950/20'
                    : 'bg-indigo-600 hover:bg-indigo-750 shadow-lg shadow-indigo-950/20'
                }`}
              >
                {isDanger && <Trash2 className="w-3.5 h-3.5" />}
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
