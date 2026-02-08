
import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, enableIndexedDbPersistence } from 'firebase/firestore';
import { LocationId, ShoppingItem, AppState, HistoryItem } from './types';
import LocationSelector from './components/LocationSelector';
import ShoppingListView from './components/ShoppingListView';
import LoginScreen from './components/LoginScreen';

const firebaseConfig = {
  apiKey: "ここに貼り付け",
  authDomain: "ここに貼り付け",
  projectId: "ここに貼り付け",
  storageBucket: "ここに貼り付け",
  messagingSenderId: "ここに貼り付け",
  appId: "ここに貼り付け"
};

let db: any = null;
try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "ここに貼り付け") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    enableIndexedDbPersistence(db).catch((err: any) => {
      console.warn("オフライン保存の有効化に失敗:", err.code);
    });
  }
} catch (e) {
  console.error("Firebase初期化エラー:", e);
}

const STORAGE_KEY = 'slow_life_auth_v2';
const SHARED_DOC_ID = 'company_8349';

const PROTOTYPE_2_STATE: AppState = {
  currentLocation: null,
  lists: {
    slowlife1: [],
    slowlife2: [],
  },
  masterHistory: [],
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const [state, setState] = useState<AppState>(PROTOTYPE_2_STATE);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncToCloud = useCallback(async (newState: AppState) => {
    if (!db) return;
    setIsSyncing(true);
    try {
      const { currentLocation, ...dataToSync } = newState;
      await setDoc(doc(db, "shopping_lists", SHARED_DOC_ID), dataToSync);
    } catch (e) {
      console.error("保存失敗:", e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!db || !isLoggedIn) return;
    setIsSyncing(true);
    const unsub = onSnapshot(doc(db, "shopping_lists", SHARED_DOC_ID), (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data() as any;
        setState(prev => ({
          ...cloudData,
          currentLocation: prev.currentLocation
        }));
      } else {
        syncToCloud(PROTOTYPE_2_STATE);
      }
      setIsSyncing(false);
    }, (error) => {
      console.error("同期エラー:", error);
      setIsSyncing(false);
    });
    return () => unsub();
  }, [isLoggedIn, syncToCloud]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const setLocation = (location: LocationId | null) => {
    setState(prev => ({ ...prev, currentLocation: location }));
  };

  // 複数アイテムを一括追加するためのメイン関数
  const addItems = useCallback((itemsData: { name: string; color?: string; quantity?: string }[]) => {
    if (!state.currentLocation) return;
    const loc = state.currentLocation;

    const newShoppingItems: ShoppingItem[] = itemsData
      .filter(d => d.name.trim() !== "")
      .map(d => ({
        id: crypto.randomUUID(),
        name: d.name.trim(),
        completed: false,
        createdAt: Date.now(),
        color: d.color || '#ffffff',
        quantity: d.quantity || '',
      }));

    if (newShoppingItems.length === 0) return;

    // 履歴の更新ロジック（追加されたものをすべて先頭に持ってくる）
    let nextHistory = [...state.masterHistory];
    newShoppingItems.forEach(item => {
      nextHistory = [
        { name: item.name, color: item.color },
        ...nextHistory.filter(h => h.name !== item.name)
      ];
    });
    nextHistory = nextHistory.slice(0, 100);

    const newState = {
      ...state,
      lists: {
        ...state.lists,
        [loc]: [...newShoppingItems, ...(state.lists[loc] || [])],
      },
      masterHistory: nextHistory,
    };
    
    setState(newState);
    syncToCloud(newState);
  }, [state, syncToCloud]);

  // 単一追加も一括追加の仕組みを利用するように統一
  const addItem = useCallback((name: string, color: string = '#ffffff', quantity: string = '') => {
    addItems([{ name, color, quantity }]);
  }, [addItems]);

  const updateItem = useCallback((id: string, updates: Partial<ShoppingItem>) => {
    if (!state.currentLocation) return;

    const newState = {
      ...state,
      lists: {
        ...state.lists,
        [state.currentLocation]: state.lists[state.currentLocation].map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
      },
    };
    setState(newState);
    syncToCloud(newState);
  }, [state, syncToCloud]);

  const toggleItem = (id: string) => {
    if (!state.currentLocation) return;
    const item = state.lists[state.currentLocation].find(i => i.id === id);
    if (item) {
      updateItem(id, { completed: !item.completed });
    }
  };

  const deleteItem = (id: string) => {
    if (!state.currentLocation) return;
    const newState = {
      ...state,
      lists: {
        ...state.lists,
        [state.currentLocation]: state.lists[state.currentLocation].filter(item => item.id !== id),
      },
    };
    setState(newState);
    syncToCloud(newState);
  };

  const updateOrder = useCallback((items: ShoppingItem[]) => {
    if (!state.currentLocation) return;
    const newState = {
      ...state,
      lists: { ...state.lists, [state.currentLocation]: items },
    };
    setState(newState);
    syncToCloud(newState);
  }, [state, syncToCloud]);

  const updateHistoryOrder = useCallback((newHistory: HistoryItem[]) => {
    const newState = { ...state, masterHistory: newHistory };
    setState(newState);
    syncToCloud(newState);
  }, [state, syncToCloud]);

  const resetList = useCallback(() => {
    const loc = state.currentLocation;
    if (!loc || !state.lists[loc] || state.lists[loc].length === 0) return;
    
    const newState = {
      ...state,
      lists: {
        ...state.lists,
        [loc]: [],
      },
    };
    setState(newState);
    syncToCloud(newState);
  }, [state, syncToCloud]);

  const deleteHistoryItem = useCallback((name: string) => {
    const newState = {
      ...state,
      masterHistory: state.masterHistory.filter(h => h.name !== name),
    };
    setState(newState);
    syncToCloud(newState);
  }, [state, syncToCloud]);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#fdfaf6] text-[#4a3f35] shadow-xl flex flex-col relative overflow-hidden">
      {!state.currentLocation ? (
        <LocationSelector onSelect={setLocation} />
      ) : (
        <ShoppingListView
          locationId={state.currentLocation}
          items={state.lists[state.currentLocation] || []}
          masterHistory={state.masterHistory || []}
          isSyncing={isSyncing}
          onBack={() => setLocation(null)}
          onAdd={addItem}
          onAddMany={addItems}
          onUpdateItem={updateItem}
          onToggle={toggleItem}
          onDelete={deleteItem}
          onUpdateOrder={updateOrder}
          onUpdateHistoryOrder={updateHistoryOrder}
          onReset={resetList}
          onDeleteHistoryItem={deleteHistoryItem}
        />
      )}
    </div>
  );
};

export default App;
