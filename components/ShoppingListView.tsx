
import React, { useState, useRef, useEffect } from 'react';
import Sortable from 'https://esm.sh/sortablejs@1.15.2';
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
  onToggle: (id: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onUpdateQuantity: (id: string, quantity: string) => void;
  onDelete: (id: string) => void;
  onUpdateOrder: (items: ShoppingItem[]) => void;
  onUpdateHistoryOrder: (history: HistoryItem[]) => void;
  onReset: () => void;
  onResetHistory: () => void;
  onResetApp: () => void;
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
  items,
  masterHistory,
  isSyncing = false,
  onBack,
  onAdd,
  onToggle,
  onUpdateColor,
  onUpdateQuantity,
  onDelete,
  onUpdateOrder,
  onUpdateHistoryOrder,
  onReset,
  onResetHistory,
  onResetApp,
  onDeleteHistoryItem,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [quantityValue, setQuantityValue] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmType, setConfirmType] = useState<'list' | 'history' | 'app' | null>(null);
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState(false);

  // AI Mode States
  const [aiMode, setAiMode] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ name: string; quantity: string; selected: boolean }[]>([]);
  const [aiSelectedColor, setAiSelectedColor] = useState('#ffffff');
  
  // Item Edit States
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState('');
  
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
        delayOnTouchOnly: true,
        onEnd: (evt: any) => {
          const newItems = [...items];
          const [movedItem] = newItems.splice(evt.oldIndex, 1);
          newItems.splice(evt.newIndex, 0, movedItem);
          onUpdateOrder(newItems);
        },
      });
    }
    return () => {
      if (sortableRef.current) {
        sortableRef.current.destroy();
        sortableRef.current = null;
      }
    };
  }, [items, onUpdateOrder]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleVoiceInput = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!recognitionRef.current) {
      alert('音声入力に対応していません');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Speech stop error:", err);
      }
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech start error:", err);
        setIsListening(false);
      }
    }
  };

  const handleAiAction = async () => {
    if (!inputValue.trim()) return;
    
    setIsAiLoading(true);
    setAiSuggestions([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `料理名「${inputValue}」を作るために、一般的なスーパーで購入が必要な食材リストを教えてください。`,
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
                    name: { type: Type.STRING, description: '食材名' },
                    quantity: { type: Type.STRING, description: '目安の分量' }
                  },
                  required: ['name', 'quantity']
                }
              }
            },
            required: ['ingredients']
          }
        }
      });

      const data = JSON.parse(response.text || '{"ingredients":[]}');
      setAiSuggestions(data.ingredients.map((ing: any) => ({ ...ing, selected: true })));
    } catch (e) {
      console.error("AI予測失敗:", e);
      alert("食材の予測に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsAiLoading(false);
    }
  };

  const updateAiSuggestionQuantity = (index: number, newQty: string) => {
    const newSuggestions = [...aiSuggestions];
    newSuggestions[index].quantity = newQty;
    setAiSuggestions(newSuggestions);
  };

  const addSelectedAiItems = () => {
    const selectedItems = aiSuggestions.filter(s => s.selected);
    selectedItems.forEach(item => {
      onAdd(item.name, aiSelectedColor, item.quantity);
    });
    setAiSuggestions([]);
    setInputValue('');
    setAiMode(false);
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

  const handleAppReset = () => {
    if (password === 'hirake5ma') {
      onResetApp();
      setConfirmType(null);
      setPassword('');
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const saveQuantityEdit = (id: string) => {
    onUpdateQuantity(id, tempQuantity);
    setEditingQuantityId(null);
    setTempQuantity('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative" onClick={() => { setEditingColorId(null); setEditingQuantityId(null); }}>
      <header className="px-4 pt-6 pb-4 flex items-center justify-between bg-white border-b sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 p-2">
            <i className="fa-solid fa-chevron-left text-xl"></i>
          </button>
          {isSyncing && (
            <div className="ml-1 text-blue-400 animate-pulse">
              <i className="fa-solid fa-cloud text-[10px]"></i>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-bold" style={{ color: themeColor }}>{locationName}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); setConfirmType('list'); }}
            className="text-red-400 hover:text-red-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-50 transition-all border border-transparent active:border-red-100"
          >
            カゴ消去
          </button>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="text-gray-300 hover:text-gray-500 p-2">
              <i className="fa-solid fa-ellipsis-vertical text-lg"></i>
            </button>
            {showSettings && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fadeIn overflow-hidden">
                <button 
                  onClick={() => { setConfirmType('history'); setShowSettings(false); }}
                  className="w-full text-left px-4 py-3 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-3"
                >
                  <i className="fa-solid fa-clock-rotate-left w-4 text-center"></i>
                  履歴リストを空にする
                </button>
                <div className="border-t border-gray-50"></div>
                <button 
                  onClick={() => { setConfirmType('app'); setShowSettings(false); }}
                  className="w-full text-left px-4 py-3 text-xs text-red-400 hover:bg-red-50 flex items-center gap-3 font-bold"
                >
                  <i className="fa-solid fa-rotate-left w-4 text-center"></i>
                  全初期化 (プロトタイプ1)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="p-6 bg-white shadow-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex gap-4">
              {COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all shadow-sm flex items-center justify-center ${
                    selectedColor === color.value ? 'scale-110 border-gray-400' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {selectedColor === color.value && <i className="fa-solid fa-check text-[10px] text-gray-400"></i>}
                </button>
              ))}
            </div>
            <button 
              onClick={() => {
                setAiMode(!aiMode);
                setAiSuggestions([]);
                setInputValue('');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border-2 ${
                aiMode ? 'bg-purple-500 border-purple-500 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'
              }`}
            >
              <i className={`fa-solid fa-wand-magic-sparkles ${aiMode ? 'animate-pulse' : ''}`}></i>
              {aiMode ? 'AIモードON' : 'AIモード'}
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={aiMode ? "作りたいメニューと何人前か入力" : "何を買いますか？"}
                  className={`w-full pl-4 pr-10 py-3 rounded-2xl border-2 outline-none transition-all ${
                    aiMode ? 'border-purple-100 focus:border-purple-300 bg-purple-50/20' : 'border-gray-100 focus:border-gray-200'
                  }`}
                />
                <button
                  onClick={handleVoiceInput}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors z-10 ${
                    isListening 
                      ? 'text-red-500 animate-pulse bg-red-50' 
                      : (aiMode ? 'text-purple-400 hover:text-purple-600' : 'text-gray-400 hover:text-gray-600')
                  }`}
                >
                  <i className="fa-solid fa-microphone"></i>
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={isAiLoading}
                style={{ backgroundColor: aiMode ? '#a855f7' : themeColor }}
                className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0 disabled:opacity-50"
              >
                {isAiLoading ? (
                  <i className="fa-solid fa-circle-notch animate-spin text-xl"></i>
                ) : (
                  <i className={`fa-solid ${aiMode ? 'fa-magnifying-glass' : 'fa-plus'} text-xl`}></i>
                )}
              </button>
            </div>
            
            {!aiMode && (
              <div className="w-full">
                <input
                  type="text"
                  value={quantityValue}
                  onChange={(e) => setQuantityValue(e.target.value)}
                  placeholder="個数を入力（任意）"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-50 focus:border-gray-100 bg-gray-50/30 outline-none transition-all text-sm"
                />
              </div>
            )}

            {/* AI Suggestions Panel */}
            {aiSuggestions.length > 0 && (
              <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100 animate-fadeIn space-y-3 shadow-sm">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-bold text-purple-600 tracking-wider">予測食材（個数編集可）</span>
                  <button onClick={() => setAiSuggestions([])} className="text-purple-300 hover:text-purple-500">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {aiSuggestions.map((s, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                        s.selected ? 'bg-white border-purple-200 shadow-sm' : 'bg-transparent border-transparent opacity-40'
                      }`}
                    >
                      <button
                        onClick={() => {
                          const newS = [...aiSuggestions];
                          newS[idx].selected = !newS[idx].selected;
                          setAiSuggestions(newS);
                        }}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                          s.selected ? 'bg-purple-500 border-purple-500 text-white' : 'border-purple-200'
                        }`}
                      >
                        {s.selected && <i className="fa-solid fa-check text-[10px]"></i>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-gray-700 truncate block">{s.name}</span>
                      </div>
                      <input
                        type="text"
                        value={s.quantity}
                        onChange={(e) => updateAiSuggestionQuantity(idx, e.target.value)}
                        className="w-20 px-2 py-1 text-xs border rounded-lg outline-none focus:border-purple-300 text-right bg-purple-50/30 font-bold text-purple-600"
                        placeholder="分量"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-center gap-3 bg-white/50 py-2 rounded-xl border border-purple-100">
                    <span className="text-[10px] font-bold text-gray-400">カードの色:</span>
                    {COLORS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setAiSelectedColor(color.value)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          aiSelectedColor === color.value ? 'scale-110 border-purple-400' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={addSelectedAiItems}
                    className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all"
                  >
                    選択した食材を追加
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="w-full py-2.5 bg-[#f3f0ec] text-[#8b7d6b] rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-gray-200 hover:bg-[#e9e5e0] transition-colors"
        >
          <i className="fa-solid fa-list-ul"></i>
          履歴リストから選ぶ
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-3 pb-24">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-300 pointer-events-none">
            <i className="fa-solid fa-basket-shopping text-4xl mb-4 opacity-30"></i>
            <p className="text-sm font-bold opacity-50">買い物依頼はありません</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-4 rounded-2xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing relative ${
                item.completed ? 'opacity-60 grayscale-[0.5]' : ''
              }`}
              style={{ backgroundColor: item.color || '#ffffff' }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all bg-white shrink-0 ${
                  item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-transparent'
                }`}
              >
                <i className="fa-solid fa-check text-xs"></i>
              </button>
              <div className="flex-1 flex items-baseline justify-between gap-2 overflow-hidden">
                {editingQuantityId === item.id ? (
                  <div className="flex-1 flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      value={tempQuantity}
                      onChange={(e) => setTempQuantity(e.target.value)}
                      onBlur={() => saveQuantityEdit(item.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveQuantityEdit(item.id)}
                      className="w-full px-2 py-1 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white font-bold"
                    />
                  </div>
                ) : (
                  <>
                    <span className={`text-[15px] font-bold transition-all truncate ${item.completed ? 'line-through text-gray-400 font-normal' : 'text-[#4a3f35]'}`}>
                      {item.name}
                      {item.quantity && (
                        <span className="ml-2 px-2 py-0.5 bg-white/50 rounded-lg text-xs font-bold text-gray-500">
                          {item.quantity}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal shrink-0">{formatDate(item.createdAt)}</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                {/* Quantity edit button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingQuantityId(item.id); setTempQuantity(item.quantity || ''); }}
                  className="text-gray-300 hover:text-gray-500 p-2 transition-colors"
                >
                  <i className="fa-solid fa-pen-to-square text-sm"></i>
                </button>

                {/* Color Picker Toggle */}
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingColorId(editingColorId === item.id ? null : item.id); }}
                    className="text-gray-300 hover:text-gray-500 p-2 transition-colors"
                  >
                    <i className="fa-solid fa-palette text-sm"></i>
                  </button>
                  {editingColorId === item.id && (
                    <div className="absolute right-0 bottom-full mb-2 bg-white p-2 rounded-xl shadow-xl border border-gray-100 flex gap-2 z-20 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                      {COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { onUpdateColor(item.id, c.value); setEditingColorId(null); }}
                          className={`w-6 h-6 rounded-full border border-gray-100 shadow-sm ${item.color === c.value ? 'ring-2 ring-gray-400' : ''}`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="text-gray-300 hover:text-red-400 p-2 transition-colors shrink-0">
                  <i className="fa-solid fa-trash-can text-sm"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setConfirmType(null); setPassword(''); setPassError(false); }} />
          <div className="relative bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl text-center space-y-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${confirmType === 'app' ? 'bg-gray-100' : 'bg-red-50 text-red-500'}`}>
              <i className={`fa-solid ${confirmType === 'app' ? 'fa-lock' : 'fa-trash-can'} text-xl`}></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {confirmType === 'list' ? '現在のカゴを空にしますか？' : confirmType === 'history' ? '過去の履歴をすべて消去しますか？' : 'プロトタイプ１に戻しますか？'}
              </h3>
              {confirmType === 'app' && (
                <>
                  <p className="text-[10px] text-gray-400 mb-4">初期状態（データなし）にリセットされます</p>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPassError(false); }}
                    placeholder="パスワードを入力"
                    className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all text-center ${passError ? 'border-red-300 bg-red-50' : 'border-gray-100 focus:border-gray-300'}`}
                  />
                  {passError && <p className="text-center text-[10px] text-red-500 mt-2 font-bold">パスワードが違います</p>}
                </>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (confirmType === 'list') onReset();
                  else if (confirmType === 'history') onResetHistory();
                  else if (confirmType === 'app') { handleAppReset(); return; }
                  setConfirmType(null);
                }}
                className={`w-full py-4 rounded-2xl font-bold text-sm text-white active:scale-95 transition-all ${confirmType === 'app' ? 'bg-gray-800' : 'bg-red-500'}`}
              >
                {confirmType === 'app' ? 'プロトタイプ１に戻す' : 'はい、消去する'}
              </button>
              <button onClick={() => { setConfirmType(null); setPassword(''); setPassError(false); }} className="w-full py-3 bg-transparent text-gray-400 font-bold text-sm">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <MasterListModal
          history={masterHistory}
          onSelect={(name, color, quantity) => { onAdd(name, color, quantity); setShowHistory(false); }}
          onDeleteHistoryItem={onDeleteHistoryItem}
          onUpdateHistoryOrder={onUpdateHistoryOrder}
          onClose={() => setShowHistory(false)}
          themeColor={themeColor}
        />
      )}
      {showSettings && <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />}
    </div>
  );
};

export default ShoppingListView;
