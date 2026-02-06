
import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  enableIndexedDbPersistence 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { LocationId, ShoppingItem, AppState, HistoryItem } from './types';
import LocationSelector from './components/LocationSelector';
import ShoppingListView from './components/ShoppingListView';
import LoginScreen from './components/LoginScreen';

/**
 * 【Firebase設定の貼り付け手順】
 * Firebaseコンソールで取得した config の内容を下の {} 内に上書きしてください。
 */
const firebaseConfig = {
  apiKey: "ここに貼り付け",
  authDomain: "ここに貼り付け",
  projectId: "ここに貼り付け",
  storageBucket: "ここに貼り付け",
  messagingSenderId: "ここに貼り付け",
  appId: "ここに貼り付け"
};

// Firebaseの初期化
let db: any = null;
try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "ここに貼り付け") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    enableIndexedDbPersistence(db).catch((err: any) => {
      if (err.code === 'failed-precondition') {
        console.warn("複数タブが開かれているため、オフライン保存は1つのタブのみで有効です。");
      } else if (err.code === 'unimplemented') {
        console.warn("現在のブラウザはオフライン保存をサポートしていません。");
      }
    });
  }
} catch (e) {
  console.error("Firebase初期化エラー:", e);
}

const STORAGE_KEY = 'slow_life_shopping_data_v2';
const AUTH_KEY = 'slow_life_auth_v2';
const SHARED_DOC_ID = 'company_8349';

// 【プロトタイプ１】としての初期状態定義
const PROTOTYPE_1_STATE: AppState = {
  currentLocation: null,
  lists: {
    slowlife1: [],
    slowlife2: [],
  },
  masterHistory: [],
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });

  const [state, setState] = useState<AppState>(PROTOTYPE_1_STATE);
  const [isSyncing, setIsSyncing] = useState(false);

  // クラウドへデータを保存する関数
  const syncToCloud = async (newState: AppState) => {
    if (!db) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return;
    }
    
    setIsSyncing(true);
    try {
      const { currentLocation, ...dataToSync } = newState;
      await setDoc(doc(db, "shopping_lists", SHARED_DOC_ID), dataToSync);
    } catch (e) {
      console.error("クラウド保存失敗:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // クラウドから最新データを受け取る
  useEffect(() => {
    if (!db || !isLoggedIn) return;

    setIsSyncing(true);
    const unsub = onSnapshot(doc(db, "shopping_lists", SHARED_DOC_ID), (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data() as any;
        
        const sanitizedHistory = (cloudData.masterHistory || []).map((h: any) => 
          typeof h === 'string' ? { name: h, color: '#ffffff' } : h
        );

        setState(prev => ({
          ...cloudData,
          masterHistory: sanitizedHistory,
          currentLocation: prev.currentLocation
        }));
      } else {
        syncToCloud(PROTOTYPE_1_STATE);
      }
      setIsSyncing(false);
    }, (error) => {
      console.error("同期エラー:", error);
      setIsSyncing(false);
    });

    return () => unsub();
  }, [isLoggedIn]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem(AUTH_KEY, 'true');
  };

  const setLocation = (location: LocationId | null) => {
    setState(prev => ({ ...prev, currentLocation: location }));
  };

  const addItem = useCallback((name: string, color: string = '#ffffff', quantity: string = '') => {
    setState(prev => {
      const { currentLocation } = prev;
      if (!currentLocation || !name.trim()) return prev;

      const trimmedName = name.trim();
      const newItem: ShoppingItem = {
        id: crypto.randomUUID(),
        name: trimmedName,
        completed: false,
        createdAt: Date.now(),
        color: color,
        quantity: quantity,
      };

      const newHistory: HistoryItem[] = [
        { name: trimmedName, color },
        ...prev.masterHistory.filter(h => h.name !== trimmedName)
      ].slice(0, 100);

      const newState = {
        ...prev,
        lists: {
          ...prev.lists,
          [currentLocation]: [newItem, ...prev.lists[currentLocation]],
        },
        masterHistory: newHistory,
      };
      
      syncToCloud(newState);
      return newState;
    });
  }, []);

  const toggleItem = (id: string) => {
    setState(prev => {
      const { currentLocation } = prev;
      if (!currentLocation) return prev;

      const newState = {
        ...prev,
        lists: {
          ...prev.lists,
          [currentLocation]: prev.lists[currentLocation].map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
          ),
        },
      };
      syncToCloud(newState);
      return newState;
    });
  };

  const updateItemColor = (id: string, color: string) => {
    setState(prev => {
      const { currentLocation } = prev;
      if (!currentLocation) return prev;

      const newState = {
        ...prev,
        lists: {
          ...prev.lists,
          [currentLocation]: prev.lists[currentLocation].map(item =>
            item.id === id ? { ...item, color } : item
          ),
        },
      };
      syncToCloud(newState);
      return newState;
    });
  };

  const updateItemQuantity = (id: string, quantity: string) => {
    setState(prev => {
      const { currentLocation } = prev;
      if (!currentLocation) return prev;

      const newState = {
        ...prev,
        lists: {
          ...prev.lists,
          [currentLocation]: prev.lists[currentLocation].map(item =>
            item.id === id ? { ...item, quantity } : item
          ),
        },
      };
      syncToCloud(newState);
      return newState;
    });
  };

  const deleteItem = (id: string) => {
    setState(prev => {
      const { currentLocation } = prev;
      if (!currentLocation) return prev;

      const newState = {
        ...prev,
        lists: {
          ...prev.lists,
          [currentLocation]: prev.lists[currentLocation].filter(item => item.id !== id),
        },
      };
      syncToCloud(newState);
      return newState;
    });
  };

  const updateListOrder = useCallback((items: ShoppingItem[]) => {
    setState(prev => {
      if (!prev.currentLocation) return prev;
      const newState = {
        ...prev,
        lists: {
          ...prev.lists,
          [prev.currentLocation]: items,
        },
      };
      syncToCloud(newState);
      return newState;
    });
  }, []);

  const updateHistoryOrder = useCallback((newHistory: HistoryItem[]) => {
    setState(prev => {
      const newState = {
        ...prev,
        masterHistory: newHistory,
      };
      syncToCloud(newState);
      return newState;
    });
  }, []);

  const resetList = useCallback(() => {
    setState(prev => {
      const { currentLocation } = prev;
      if (!currentLocation) return prev;
      const newState = {
        ...prev,
        lists: {
          ...prev.lists,
          [currentLocation]: [],
        },
      };
      syncToCloud(newState);
      return newState;
    });
  }, []);

  // 履歴リストをすべて削除する関数
  const resetHistory = useCallback(() => {
    setState(prev => {
      const newState = {
        ...prev,
        masterHistory: [], // 履歴を完全に空にする
      };
      syncToCloud(newState);
      return newState;
    });
  }, []);

  const deleteHistoryItem = useCallback((name: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        masterHistory: prev.masterHistory.filter(h => h.name !== name),
      };
      syncToCloud(newState);
      return newState;
    });
  }, []);

  // アプリを【プロトタイプ１】の初期状態に戻す関数
  const resetToPrototype1 = useCallback(async () => {
    await syncToCloud(PROTOTYPE_1_STATE);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUTH_KEY);
    setState(PROTOTYPE_1_STATE);
    setIsLoggedIn(false);
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen max-w-md mx-auto bg-[#fdfaf6] text-[#4a3f35] shadow-xl flex flex-col relative overflow-hidden">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#fdfaf6] text-[#4a3f35] shadow-xl flex flex-col relative overflow-hidden">
      {!state.currentLocation ? (
        <LocationSelector 
          onSelect={setLocation} 
          onResetApp={resetToPrototype1} 
        />
      ) : (
        <ShoppingListView
          locationId={state.currentLocation}
          items={state.lists[state.currentLocation]}
          masterHistory={state.masterHistory}
          isSyncing={isSyncing}
          onBack={() => setLocation(null)}
          onAdd={addItem}
          onToggle={toggleItem}
          onUpdateColor={updateItemColor}
          onUpdateQuantity={updateItemQuantity}
          onDelete={deleteItem}
          onUpdateOrder={updateListOrder}
          onUpdateHistoryOrder={updateHistoryOrder}
          onReset={resetList}
          onResetHistory={resetHistory}
          onResetApp={resetToPrototype1}
          onDeleteHistoryItem={deleteHistoryItem}
        />
      )}
    </div>
  );
};

export default App;
