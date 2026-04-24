import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className={`bg-dark-800 rounded-xl border border-dark-700 w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
