
export type LocationId = 'slowlife1' | 'slowlife2';

export interface HistoryItem {
  name: string;
  color: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  completed: boolean;
  createdAt: number;
  color: string;
  quantity?: string;
}

export interface AppState {
  currentLocation: LocationId | null;
  lists: Record<LocationId, ShoppingItem[]>;
  masterHistory: HistoryItem[];
}
