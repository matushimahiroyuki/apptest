
import React, { useState } from 'react';
import { LocationId } from '../types';

interface Props {
  onSelect: (id: LocationId) => void;
  onResetApp: () => void;
}

const LocationSelector: React.FC<Props> = ({ onSelect, onResetApp }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleReset = () => {
    // パスワード「hirake5ma」でプロトタイプ１に戻る
    if (password === 'hirake5ma') {
      onResetApp();
      setShowConfirm(false);
      setPassword('');
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between flex-1 p-8 text-center animate-fadeIn min-h-screen relative">
      <div className="w-full pt-12">
        <div className="mb-12">
          <div className="bg-[#8dad82] text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <i className="fa-solid fa-house-chimney text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-[#5c7c51] mb-2">Slow Life</h1>
          <p className="text-gray-500 text-sm tracking-widest uppercase opacity-60 font-bold">Shopping List</p>
        </div>
        <div className="w-full space-y-6">
          <button onClick={() => onSelect('slowlife1')} className="w-full bg-white border-2 border-[#8dad82] text-[#5c7c51] py-8 px-6 rounded-3xl shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="bg-[#e9f2e6] p-4 rounded-2xl group-hover:bg-[#8dad82] group-hover:text-white transition-colors">
                <i className="fa-solid fa-leaf text-2xl"></i>
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold opacity-60 mb-1">拠点１</span>
                <span className="text-xl font-bold">すろーらいふ 1</span>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300"></i>
          </button>
          <button onClick={() => onSelect('slowlife2')} className="w-full bg-white border-2 border-[#d4a373] text-[#a06d3d] py-8 px-6 rounded-3xl shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="bg-[#fef3e7] p-4 rounded-2xl group-hover:bg-[#d4a373] group-hover:text-white transition-colors">
                <i className="fa-solid fa-sun text-2xl"></i>
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold opacity-60 mb-1">拠点２</span>
                <span className="text-xl font-bold">すろーらいふ 2</span>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300"></i>
          </button>
        </div>
      </div>
      <div className="pb-8 w-full">
        <button onClick={() => setShowConfirm(true)} className="text-gray-300 hover:text-gray-500 text-[10px] font-bold py-2 px-4 border border-transparent hover:border-gray-200 rounded-full transition-all">
          <i className="fa-solid fa-rotate-left mr-1"></i>
          デフォルト
        </button>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowConfirm(false); setPassword(''); setError(false); }} />
          <div className="relative bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl space-y-6 animate-fadeIn">
            <div className="w-14 h-14 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto">
              <i className="fa-solid fa-lock text-xl"></i>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-800 mb-2">プロトタイプ１に戻す</h3>
              <p className="text-[10px] text-gray-400 mb-4">すべてのリストと履歴が消去されます</p>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="パスワードを入力"
                className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-center ${error ? 'border-red-300 bg-red-50' : 'border-gray-100 focus:border-gray-300'}`}
              />
              {error && <p className="text-[10px] text-red-500 mt-2 font-bold">パスワードが違います</p>}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleReset} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">初期状態に戻す</button>
              <button onClick={() => { setShowConfirm(false); setPassword(''); setError(false); }} className="w-full py-3 bg-transparent text-gray-400 font-bold text-sm">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
