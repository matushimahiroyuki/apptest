
import React from 'react';
import { LocationId } from '../types';

interface Props {
  onSelect: (id: LocationId) => void;
}

const LocationSelector: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center animate-fadeIn">
      <div className="mb-12">
        <div className="bg-[#8dad82] text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <i className="fa-solid fa-house-chimney text-3xl"></i>
        </div>
        <h1 className="text-3xl font-bold text-[#5c7c51] mb-2">Slow Life</h1>
        <p className="text-gray-400 text-xs tracking-widest uppercase font-bold">Shopping List</p>
      </div>

      <div className="w-full space-y-6">
        <button
          onClick={() => onSelect('slowlife1')}
          className="w-full bg-white border-2 border-[#8dad82] text-[#5c7c51] py-8 px-6 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center gap-4"
        >
          <div className="bg-[#e9f2e6] p-4 rounded-2xl text-[#8dad82]">
            <i className="fa-solid fa-leaf text-2xl"></i>
          </div>
          <div className="text-left">
            <span className="block text-xs font-bold opacity-60 mb-1">拠点１</span>
            <span className="text-xl font-bold">すろーらいふ 1</span>
          </div>
        </button>

        <button
          onClick={() => onSelect('slowlife2')}
          className="w-full bg-white border-2 border-[#d4a373] text-[#a06d3d] py-8 px-6 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center gap-4"
        >
          <div className="bg-[#fef3e7] p-4 rounded-2xl text-[#d4a373]">
            <i className="fa-solid fa-sun text-2xl"></i>
          </div>
          <div className="text-left">
            <span className="block text-xs font-bold opacity-60 mb-1">拠点２</span>
            <span className="text-xl font-bold">すろーらいふ 2</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default LocationSelector;
