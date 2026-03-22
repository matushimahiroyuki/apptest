
import React, { useRef, useEffect, useState } from 'react';
import Sortable from 'sortablejs';
import { HistoryItem } from '../types';

interface Props {
  history: HistoryItem[];
  onSelect: (name: string, color: string, quantity: string) => void;
  onDeleteHistoryItem: (name: string) => void;
  onUpdateHistoryOrder: (history: HistoryItem[]) => void;
  onClose: () => void;
}

const COLORS = [
  { id: 'white', value: '#ffffff' },
  { id: 'pink', value: '#ffecf0' },
  { id: 'blue', value: '#e3f2fd' },
  { id: 'green', value: '#f1f8e9' },
];

const MasterListModal: React.FC<Props> = ({ history, onSelect, onDeleteHistoryItem, onUpdateHistoryOrder, onClose }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<any>(null);
  
  // Selection state for detail entry
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [tempColor, setTempColor] = useState('#ffffff');
  const [tempQuantity, setTempQuantity] = useState('');

  useEffect(() => {
    if (gridRef.current && history.length > 0) {
      sortableRef.current = new Sortable(gridRef.current, {
        animation: 150,
        ghostClass: 'opacity-20',
        delay: 100,
        delayOnTouchOnly: true,
        filter: '.no-drag', // Detail panel elements should not trigger drag
        onEnd: (evt: any) => {
          const newHistory = [...history];
          const [movedItem] = newHistory.splice(evt.oldIndex, 1);
          newHistory.splice(evt.newIndex, 0, movedItem);
          onUpdateHistoryOrder(newHistory);
        },
      });
    }
    return () => sortableRef.current?.destroy();
  }, [history, onUpdateHistoryOrder]);

  const handleItemClick = (item: HistoryItem) => {
    if (selectedItemName === item.name) {
      setSelectedItemName(null);
    } else {
      setSelectedItemName(item.name);
      setTempColor(item.color);
      setTempQuantity('');
    }
  };

  const confirmAdd = () => {
    if (selectedItemName) {
      onSelect(selectedItemName, tempColor, tempQuantity);
      setSelectedItemName(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fadeIn">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#fdfaf6] w-full max-w-md h-[80vh] rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b bg-white flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-800">買い物履歴</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
          <div ref={gridRef} className="flex flex-col gap-3 pb-8">
            {history.map((item, index) => (
              <div key={`${item.name}-${index}`} className="relative">
                <div 
                  onClick={() => handleItemClick(item)}
                  className={`w-full p-5 pr-12 text-left border rounded-3xl bg-white shadow-sm transition-all flex flex-col gap-1 cursor-pointer ${selectedItemName === item.name ? 'ring-2 ring-gray-200' : 'hover:border-gray-200'}`}
                  style={{ borderLeft: `6px solid ${item.color}` }}
                >
                  <span className="text-sm font-bold text-[#6b5e51] line-clamp-1">{item.name}</span>
                  {selectedItemName !== item.name && (
                     <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Tap to customize</span>
                  )}
                </div>
                
                {/* Delete icon (only visible when not editing) */}
                {selectedItemName !== item.name && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteHistoryItem(item.name); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-200 hover:text-red-400 transition-colors"
                  >
                    <i className="fa-solid fa-trash-can text-sm"></i>
                  </button>
                )}

                {/* Detail Entry Panel (Expanded) */}
                {selectedItemName === item.name && (
                  <div className="no-drag mt-2 p-5 bg-white border border-gray-100 rounded-[32px] shadow-md animate-slideDown space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-bold text-gray-400">カードの色を選ぶ</span>
                      <div className="flex gap-3">
                        {COLORS.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setTempColor(c.value)}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${tempColor === c.value ? 'scale-110 border-gray-400' : 'border-transparent'}`}
                            style={{ backgroundColor: c.value }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={tempQuantity}
                        onChange={(e) => setTempQuantity(e.target.value)}
                        placeholder="個数・単位を入力 (例: 2個)"
                        className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-50 bg-gray-50/50 text-sm outline-none focus:bg-white focus:border-gray-200 transition-all"
                      />
                      <button 
                        onClick={confirmAdd}
                        className="px-6 py-3 bg-[#8dad82] text-white rounded-2xl text-sm font-bold shadow-lg shadow-green-100 active:scale-95 transition-all"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-5 border-t bg-white text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
            タップで詳細を入力 / 長押しで並び替え
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MasterListModal;
