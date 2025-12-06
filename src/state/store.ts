
import { create } from 'zustand';

interface GameState {
  mana: number;
  suspicion: number;
  isDrawerOpen: boolean;
  addMana: (amount: number) => void;
  increaseSuspicion: (amount: number) => void;
  toggleDrawer: (isOpen?: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  mana: 10,
  suspicion: 0,
  isDrawerOpen: false,
  addMana: (amount) => set((state) => ({ mana: state.mana + amount })),
  increaseSuspicion: (amount) => set((state) => ({ suspicion: state.suspicion + amount })),
  toggleDrawer: (isOpen) => set((state) => ({ isDrawerOpen: isOpen !== undefined ? isOpen : !state.isDrawerOpen })),
}));
