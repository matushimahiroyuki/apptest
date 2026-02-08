
import React, { useState, useRef, useEffect } from 'react';
import Sortable from 'sortablejs';
import { ShoppingItem, LocationId, HistoryItem } from '../types';
import MasterListModal from './MasterListModal';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  locationId: LocationId;
  items: ShoppingItem[];
  masterHistory: HistoryItem[];
  isSyncing?: boolean;
  onBack: () => void;
  onAdd: (name: string, color?: string, quantity?: string) => void;
  onAddMany: (items: { name: string; color?: string; quantity?: string }[]) => void;
  onUpdateItem: (id: string, updates: Partial<ShoppingItem>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateOrder: (items: ShoppingItem[]) => void;
  onUpdateHistoryOrder: (history: HistoryItem[]) => void;
  onReset: () => void;
  onDeleteHistoryItem: (name: string) => void;
}

const COLORS = [
  { id: 'white', value: '#ffffff', label: '標準' },
  { id: 'pink', value: '#ffecf0', label: 'さくら' },
  { id: 'blue', value: '#e3f2fd', label: 'そら' },
  { id: 'green', value: '#f1f8e9', label: 'わかば' },
];

const ShoppingListView: React.FC<Props> = ({
  locationId,
  items = [],
  masterHistory = [],
  isSyncing = false,
  onBack,
  onAdd,
  onAddMany,
  onUpdateItem,
  onToggle,
  onDelete,
  onUpdateOrder,
  onUpdateHistoryOrder,
  onReset,
  onDeleteHistoryItem,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [quantityValue, setQuantityValue] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [aiMode, setAiMode] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ name: string; quantity: string; selected: boolean }[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<any>(null);

  const themeColor = locationId === 'slowlife1' ? '#8dad82' : '#d4a373';
  const locationName = locationId === 'slowlife1' ? 'すろーらいふ 1' : 'すろーらいふ 2';

  useEffect(() => {
    if (listRef.current && items.length > 0) {
      sortableRef.current = new Sortable(listRef.current, {
        animation: 150,
        ghostClass: 'opacity-20',
        delay: 100,
        handle: '.drag-handle',
        delayOnTouchOnly: true,
        onEnd: (evt: any) => {
          const newItems = [...items];
          const [movedItem] = newItems.splice(evt.oldIndex, 1);
          newItems.splice(evt.newIndex, 0, movedItem);
          onUpdateOrder(newItems);
        },
      });
    } else {
      sortableRef.current?.destroy();
      sortableRef.current = null;
    }
    return () => {
      sortableRef.current?.destroy();
      sortableRef.current = null;
    };
  }, [items, onUpdateOrder]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'ja-JP';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        setInputValue(event.results[0][0].transcript);
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const handleVoiceInput = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recognitionRef.current) return;
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const handleAiAction = async () => {
    if (!inputValue.trim()) return;
    setIsAiLoading(true);
    setAiSuggestions([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `料理名「${inputValue}」を作るための食材リストを教えてください。`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.STRING }
                  },
                  required: ['name', 'quantity']
                }
              }
            },
            required: ['ingredients']
          }
        }
      });
      const data = JSON.parse(response.text?.trim() || '{"ingredients":[]}');
      setAiSuggestions(data.ingredients.map((ing: any) => ({ ...ing, selected: true })));
    } catch (e: any) {
      alert(`AIエラー: ${e.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAdd = () => {
    if (aiMode) {
      handleAiAction();
      return;
    }
    if (inputValue.trim()) {
      onAdd(inputValue, selectedColor, quantityValue.trim());
      setInputValue('');
      setQuantityValue('');
      setSelectedColor('#ffffff');
    }
  };

  const isListEmpty = items.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <header className="px-4 pt-6 pb-4 flex items-center justify-between bg-white border-b sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={onBack} className="text-gray-400 p-2"><i className="fa-solid fa-chevron-left text-xl"></i></button>
          {isSyncing && <div className="ml-1 text-blue-400 animate-pulse"><i className="fa-solid fa-cloud text-[10px]"></i></div>}
        </div>
        <h2 className="text-lg font-bold" style={{ color: themeColor }}>{locationName}</h2>
        <button 
          onClick={onReset} 
          disabled={isListEmpty}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${isListEmpty ? 'text-gray-200 cursor-not-allowed' : 'text-red-400 hover:bg-red-50 active:scale-95'}`}
        >
          カゴ消去
        </button>
      </header>

      <div className="p-6 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex gap-4">
            {COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.value)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColor === color.value ? 'scale-110 border-gray-400' : 'border-transparent'}`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
          <button 
            onClick={() => { setAiMode(!aiMode); setAiSuggestions([]); setInputValue(''); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border-2 ${aiMode ? 'bg-purple-500 border-purple-500 text-white' : 'text-gray-400 border-gray-100'}`}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            {aiMode ? 'AI ON' : 'AI予測'}
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={aiMode ? "料理名を入力" : "何を買いますか？"}
                className="w-full pl-4 pr-10 py-3 rounded-2xl border-2 border-gray-100 outline-none"
              />
              <button onClick={handleVoiceInput} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 ${isListening ? 'text-red-500' : 'text-gray-300'}`}>
                <i className="fa-solid fa-microphone"></i>
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={isAiLoading}
              style={{ backgroundColor: aiMode ? '#a855f7' : themeColor }}
              className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0"
            >
              {isAiLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className={`fa-solid ${aiMode ? 'fa-magnifying-glass' : 'fa-plus'}`}></i>}
            </button>
          </div>
          {!aiMode && (
            <input
              value={quantityValue}
              onChange={(e) => setQuantityValue(e.target.value)}
              placeholder="個数/単位（任意）"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-50 text-sm outline-none"
            />
          )}

          {aiSuggestions.length > 0 && (
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 space-y-3">
              <div className="max-h-48 overflow-y-auto space-y-2">
                {aiSuggestions.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-purple-200">
                    <button onClick={() => { const ns = [...aiSuggestions]; ns[idx].selected = !ns[idx].selected; setAiSuggestions(ns); }}
                      className={`w-5 h-5 rounded border flex items-center justify-center ${s.selected ? 'bg-purple-500 text-white' : 'border-purple-200'}`}>
                      {s.selected && <i className="fa-solid fa-check text-[10px]"></i>}
                    </button>
                    <span className="flex-1 text-sm font-bold text-gray-700">{s.name}</span>
                    <input value={s.quantity} onChange={(e) => { const ns = [...aiSuggestions]; ns[idx].quantity = e.target.value; setAiSuggestions(ns); }}
                      className="w-16 px-2 py-1 text-xs border rounded-lg text-right font-bold" />
                  </div>
                ))}
              </div>
              <button onClick={() => { 
                const selectedOnes = aiSuggestions.filter(s => s.selected).map(i => ({ name: i.name, color: '#ffffff', quantity: i.quantity }));
                onAddMany(selectedOnes);
                setAiSuggestions([]); 
                setInputValue(''); 
                setAiMode(false); 
              }}
                className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-md"
              >
                一括追加する
              </button>
            </div>
          )}
        </div>
        <button onClick={() => setShowHistory(true)} className="w-full py-2.5 bg-gray-50 text-gray-400 rounded-xl text-xs font-bold border border-gray-100">
          <i className="fa-solid fa-clock-rotate-left mr-2"></i>履歴から追加
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-3 pb-24">
        {isListEmpty ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-200 opacity-50">
            <i className="fa-solid fa-basket-shopping text-4xl mb-4"></i>
            <p className="text-sm font-bold">買い物リストは空です</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 p-4 rounded-3xl shadow-sm border border-gray-100 transition-all" style={{ backgroundColor: item.color }}>
              <div className="flex items-center gap-3">
                <div className="drag-handle text-gray-300 p-1 cursor-grab active:cursor-grabbing"><i className="fa-solid fa-grip-vertical"></i></div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggle(item.id); }} 
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-transparent'}`}
                >
                  <i className="fa-solid fa-check text-xs"></i>
                </button>
                <div className="flex-1 overflow-hidden" onClick={() => !item.completed && setEditingId(editingId === item.id ? null : item.id)}>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[15px] font-bold truncate ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.name}</span>
                    {item.quantity && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all ${
                        item.completed 
                          ? 'line-through text-gray-300 bg-white/20' 
                          : 'text-gray-500 bg-white/60'
                      }`}>
                        {item.quantity}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!item.completed && (
                    <button onClick={() => setEditingId(editingId === item.id ? null : item.id)} className={`p-2 transition-colors ${editingId === item.id ? 'text-gray-600' : 'text-gray-300'}`}>
                      <i className="fa-solid fa-pen-to-square text-sm"></i>
                    </button>
                  )}
                  <button onClick={() => onDelete(item.id)} className="text-gray-300 hover:text-red-300 p-2"><i className="fa-solid fa-trash-can text-sm"></i></button>
                </div>
              </div>

              {editingId === item.id && (
                <div className="mt-2 pt-3 border-t border-black/5 animate-fadeIn">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-3">
                      {COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onUpdateItem(item.id, { color: c.value })}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${item.color === c.value ? 'scale-110 border-gray-400' : 'border-transparent'}`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={item.quantity || ''}
                      onChange={(e) => onUpdateItem(item.id, { quantity: e.target.value })}
                      placeholder="個数を入力"
                      className="flex-1 px-3 py-2 rounded-xl border-2 border-white/50 bg-white/40 text-sm outline-none focus:bg-white transition-all"
                    />
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-600 text-white text-xs font-bold rounded-xl shadow-sm">OK</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showHistory && (
        <MasterListModal 
          history={masterHistory} 
          onSelect={(n, c, q) => { onAdd(n, c, q); setShowHistory(false); }} 
          onDeleteHistoryItem={onDeleteHistoryItem} 
          onUpdateHistoryOrder={onUpdateHistoryOrder}
          onClose={() => setShowHistory(false)} 
        />
      )}
    </div>
  );
};

export default ShoppingListView;
