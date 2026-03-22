
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { signOut } from 'firebase/auth';
import { LocationId, ShoppingItem, AppState, HistoryItem } from './types';
import LocationSelector from './components/LocationSelector';
import ShoppingListView from './components/ShoppingListView';
import LoginScreen from './components/LoginScreen';

const PROTOTYPE_2_STATE: AppState = {
  currentLocation: null,
  lists: {
    slowlife1: [],
    slowlife2: [],
  },
  masterHistory: [],
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [state, setState] = useState<AppState>(PROTOTYPE_2_STATE);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        // Ensure user document exists
        const userRef = doc(db, 'users', u.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              displayName: u.displayName || 'User',
              email: u.email || '',
              role: 'user',
              uid: u.uid
            });
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${u.uid}`);
        }
      }
    });
    return () => unsub();
  }, []);

  // Listen for items in current location
  useEffect(() => {
    if (!user || !state.currentLocation) return;
    
    const path = `locations/${state.currentLocation}/items`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShoppingItem[];
      
      setState(prev => ({
        ...prev,
        lists: {
          ...prev.lists,
          [state.currentLocation!]: items
        }
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    
    return () => unsub();
  }, [user, state.currentLocation]);

  // Listen for master history
  useEffect(() => {
    if (!user) return;
    
    const path = 'master_history';
    const q = query(collection(db, path), orderBy('lastUsedAt', 'desc'), limit(100));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as HistoryItem[];
      
      setState(prev => ({
        ...prev,
        masterHistory: history
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    
    return () => unsub();
  }, [user]);

  const setLocation = (location: LocationId | null) => {
    setState(prev => ({ ...prev, currentLocation: location }));
  };

  const addItems = useCallback(async (itemsData: { name: string; color?: string; quantity?: string }[]) => {
    if (!state.currentLocation || !user) return;
    const loc = state.currentLocation;
    setIsSyncing(true);

    try {
      const batch = writeBatch(db);
      const now = Date.now();

      for (const d of itemsData) {
        if (d.name.trim() === "") continue;
        
        const itemRef = doc(collection(db, `locations/${loc}/items`));
        const newItem: ShoppingItem = {
          id: itemRef.id,
          name: d.name.trim(),
          completed: false,
          createdAt: now,
          color: d.color || '#ffffff',
          quantity: d.quantity || '',
          uid: user.uid
        };
        batch.set(itemRef, newItem);

        // Update history
        const historyRef = doc(db, 'master_history', d.name.trim());
        batch.set(historyRef, {
          name: d.name.trim(),
          color: d.color || '#ffffff',
          lastUsedAt: now,
          uid: user.uid
        }, { merge: true });
      }

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `locations/${loc}/items`);
    } finally {
      setIsSyncing(false);
    }
  }, [state.currentLocation, user]);

  const addItem = useCallback((name: string, color: string = '#ffffff', quantity: string = '') => {
    addItems([{ name, color, quantity }]);
  }, [addItems]);

  const updateItem = useCallback(async (id: string, updates: Partial<ShoppingItem>) => {
    if (!state.currentLocation || !user) return;
    setIsSyncing(true);

    try {
      const itemRef = doc(db, `locations/${state.currentLocation}/items`, id);
      await updateDoc(itemRef, updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `locations/${state.currentLocation}/items/${id}`);
    } finally {
      setIsSyncing(false);
    }
  }, [state.currentLocation, user]);

  const toggleItem = (id: string) => {
    if (!state.currentLocation) return;
    const item = state.lists[state.currentLocation].find(i => i.id === id);
    if (item) {
      updateItem(id, { completed: !item.completed });
    }
  };

  const deleteItem = async (id: string) => {
    if (!state.currentLocation || !user) return;
    setIsSyncing(true);

    try {
      const itemRef = doc(db, `locations/${state.currentLocation}/items`, id);
      await deleteDoc(itemRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `locations/${state.currentLocation}/items/${id}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateOrder = useCallback(async (items: ShoppingItem[]) => {
    // Firestore doesn't support easy ordering updates without a 'position' field.
    // For now, we'll just update the createdAt to reflect the new order if needed,
    // or we could add a 'position' field. Let's add a 'position' field in the future.
    // For this prototype, we'll skip complex reordering in Firestore.
    console.log("Reordering in Firestore is not implemented in this prototype.");
  }, []);

  const updateHistoryOrder = useCallback(async (newHistory: HistoryItem[]) => {
    // Similar to updateOrder
    console.log("History reordering in Firestore is not implemented.");
  }, []);

  const resetList = useCallback(async () => {
    const loc = state.currentLocation;
    if (!loc || !user || !state.lists[loc] || state.lists[loc].length === 0) return;
    setIsSyncing(true);

    try {
      const batch = writeBatch(db);
      state.lists[loc].forEach(item => {
        const itemRef = doc(db, `locations/${loc}/items`, item.id);
        batch.delete(itemRef);
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `locations/${loc}/items`);
    } finally {
      setIsSyncing(false);
    }
  }, [state.currentLocation, user, state.lists]);

  const deleteHistoryItem = useCallback(async (name: string) => {
    if (!user) return;
    setIsSyncing(true);

    try {
      const historyRef = doc(db, 'master_history', name);
      await deleteDoc(historyRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `master_history/${name}`);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfaf6]">
        <div className="animate-pulse text-pink-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#fdfaf6] text-[#4a3f35] shadow-xl flex flex-col relative overflow-hidden">
      <button 
        onClick={() => signOut(auth)}
        className="absolute top-4 right-4 z-50 p-2 text-gray-300 hover:text-gray-500 transition-colors"
        title="Logout"
      >
        <i className="fa-solid fa-right-from-bracket"></i>
      </button>

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
