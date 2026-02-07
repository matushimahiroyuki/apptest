
import React, { useRef, useEffect, useState } from 'react';
import Sortable from 'sortablejs';
import { HistoryItem } from '../types';

interface Props {
  history: HistoryItem[];
  onSelect: (name: string, color: string, quantity?: string) => void;
  onDeleteHistoryItem: (name: string) => void;
  onUpdateHistoryOrder: (history: HistoryItem[]) => void;
  onClose: () => void;
  themeColor: string;
}

const MasterListModal: React.FC<Props> = ({ history, onSelect, onDeleteHistoryItem, onUpdateHistoryOrder, onClose, themeColor }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<any>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    if (gridRef.current && history.length > 0) {
      sortableRef.current = new Sortable(gridRef.current, {
        animation: 150,
        ghostClass: 'opacity-20',
        delay: 100,
        delayOnTouchOnly: true,
        onEnd: (evt: any) => {
          const newHistory = [...history];
          const [movedItem] = newHistory.splice(evt.oldIndex, 1);
          newHistory.splice(evt.newIndex, 0, movedItem);
          onUpdateHistoryOrder(newHistory);
        },
      });
    }
    return () => {
      if (sortableRef.current) {
        sortableRef.current.destroy();
        sortableRef.current = null;
      }
    };
  }, [history, onUpdateHistoryOrder]);

  const handleConfirmAdd = (name: string, color: string) => {
    onSelect(name, color, quantity.trim());
    setSelectedItemName(null);
    setQuantity('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fadeIn">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-[75vh] rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-slideUp">
        <div className="px-6 py-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-800">過去の履歴から追加</h3>
            <p className="text-[10px] text-gray-400 font-bold tracking-wider">TAP TO INPUT QUANTITY</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center active:scale-90 transition-transform">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
              <i className="fa-solid fa-clock-rotate-left text-4xl mb-4 opacity-20"></i>
              <p className="font-bold">履歴はまだありません</p>
            </div>
          ) : (
            <div ref={gridRef} className="grid grid-cols-2 gap-3 pb-8">
              {history.map((item, index) => (
                <div key={`${item.name}-${index}`} className="relative group overflow-visible">
                  {selectedItemName === item.name ? (
                    <div 
                      className="w-full p-3 border-2 rounded-2xl bg-white shadow-lg border-gray-200 animate-fadeIn z-20 space-y-2"
                      style={{ borderTopColor: item.color }}
                    >
                      <span className="block text-[10px] font-bold text-gray-400 truncate">{item.name}</span>
                      <input
                        autoFocus
                        type="text"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="個数/単位を入力"
                        className="w-full px-2 py-2 text-xs border rounded-lg outline-none focus:border-gray-400 font-bold"
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd(item.name, item.color)}
                      />
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleConfirmAdd(item.name, item.color)}
                          className="flex-1 py-2 bg-gray-800 text-white text-[10px] font-bold rounded-lg active:scale-95 transition-all shadow-sm"
                        >
                          追加
                        </button>
                        <button 
                          onClick={() => setSelectedItemName(null)}
                          className="px-2 py-2 bg-gray-100 text-gray-400 text-[10px] rounded-lg"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setSelectedItemName(item.name);
                          setQuantity('');
                        }}
                        className="w-full p-4 pr-10 text-left border border-gray-100 rounded-2xl active:scale-[0.98] transition-all flex items-center shadow-sm bg-white hover:border-gray-200"
                        style={{ borderLeft: `4px solid ${item.color || '#e5e7eb'}` }}
                      >
                        <span className="text-sm font-bold text-[#6b5e51] line-clamp-2 leading-tight">{item.name}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteHistoryItem(item.name); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-200 hover:text-red-400 transition-colors z-10"
                      >
                        <i className="fa-solid fa-trash-can text-[10px]"></i>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-5 border-t bg-white text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            <i className="fa-solid fa-hand-pointer mr-1"></i>
            タップして個数入力 / 長押しで並び替え
          </p>
        </div>
      </div>
    </div>
  );
};

export default MasterListModal;
