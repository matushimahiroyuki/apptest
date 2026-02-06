
import React, { useState } from 'react';

interface Props {
  onLogin: () => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '8349') {
      onLogin();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 animate-fadeIn bg-gradient-to-b from-white to-pink-50/30">
      <div className="w-full max-w-xs space-y-10">
        {/* Logo Section */}
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-28 h-28 bg-white rounded-[40px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-pink-100/50 border border-pink-50">
              <i className="fa-solid fa-seedling text-5xl text-pink-400"></i>
            </div>
            <div className="absolute -right-2 -top-2 bg-green-400 w-6 h-6 rounded-full border-4 border-white shadow-sm"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
            株式会社芝さくら
          </h1>
          <p className="text-[10px] text-pink-400 mt-2 font-bold tracking-[0.3em] uppercase">
            Shared Portal System
          </p>
        </div>

        {/* Form Section */}
        <div className="bg-white p-6 rounded-[32px] shadow-lg shadow-gray-200/50 border border-gray-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  ACCESS KEY
                </label>
                <i className="fa-solid fa-shield-halved text-gray-200 text-xs"></i>
              </div>
              <input
                type="password"
                inputMode="numeric"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="••••"
                className={`w-full px-6 py-4 rounded-2xl border-2 text-center text-2xl font-bold tracking-[0.5em] transition-all outline-none ${
                  error 
                    ? 'border-red-200 bg-red-50 text-red-500 animate-shake' 
                    : 'border-gray-50 bg-gray-50/50 focus:border-pink-200 focus:bg-white focus:shadow-inner'
                }`}
              />
              {error && (
                <p className="text-center text-[11px] text-red-400 font-bold mt-2 animate-fadeIn">
                  認証に失敗しました
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[#4a3f35] hover:bg-black text-white rounded-2xl font-bold text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              ポータルに入る
              <i className="fa-solid fa-right-to-bracket text-[10px] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"></i>
            </button>
          </form>
        </div>

        <div className="text-center space-y-4">
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
            このアプリは社内専用です。<br/>
            外部へのパスワード漏洩にご注意ください。
          </p>
          <div className="flex justify-center gap-4 opacity-20">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
          </div>
          <p className="text-[9px] text-gray-300 font-bold tracking-widest">
            © SHIBA SAKURA CLOUD SYSTEM
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
