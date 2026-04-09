import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Zap, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeySettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('gemini_api_key') || '');
      setSelectedModel(localStorage.getItem('gemini_model') || 'gemini-3-flash-preview');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    localStorage.setItem('gemini_model', selectedModel);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Key className="text-primary" /> Thiết lập API Key Gemini
              </h2>
              <p className="text-sm text-slate-500">Cấu hình kết nối Trợ lý AI</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">API Key của bạn</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-500">
                Lấy API key tại: <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700">Chọn Mô Hình Ưu Tiên (Model)</label>
              <div className="grid gap-3">
                {[
                  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Mặc định)', speed: 'Nhanh', desc: 'Lý tưởng nhất cho các tác vụ tổng hợp' },
                  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', speed: 'Chậm hơn', desc: 'Có khả năng lý luận tốt nhất' },
                  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', speed: 'Nhanh nhất', desc: 'Dành cho tác vụ cơ bản' },
                ].map(model => (
                  <div
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`cursor-pointer rounded-xl p-4 border transition-all ${
                      selectedModel === model.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-slate-200 hover:border-primary/50 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-slate-800">{model.name}</span>
                      {selectedModel === model.id && <CheckCircle2 size={16} className="text-primary" />}
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <span className="text-xs text-slate-500">{model.desc}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-1 bg-slate-100 rounded text-slate-600 flex items-center gap-1">
                        <Zap size={10} /> {model.speed}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
            <button onClick={onClose} className="px-5 py-2 font-bold text-sm text-slate-500 hover:bg-slate-200 rounded-xl transition-all">
              Hủy
            </button>
            <button onClick={handleSave} className="px-5 py-2 font-bold text-sm bg-primary text-white hover:opacity-90 rounded-xl shadow-lg transition-all flex items-center gap-2">
              Lưu cấu hình
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
