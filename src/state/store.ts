
import { create } from 'zustand';

interface GameState {
  mana: number;
  maxMana: number;
  suspicion: number;
  isDrawerOpen: boolean;
  whisperLevel: number;
  addMana: (amount: number) => void;
  increaseSuspicion: (amount: number) => void;
  toggleDrawer: (isOpen?: boolean) => void;
  setWhisperLevel: (level: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  mana: 20,
  maxMana: 20,
  suspicion: 0,
  isDrawerOpen: false,
  whisperLevel: 0,
  addMana: (amount) => set((state) => ({
    mana: Math.max(0, Math.min(state.maxMana, state.mana + amount))
  })),
  increaseSuspicion: (amount) => set((state) => ({ suspicion: state.suspicion + amount })),
  toggleDrawer: (isOpen) => set((state) => ({ isDrawerOpen: isOpen !== undefined ? isOpen : !state.isDrawerOpen })),
  setWhisperLevel: (level) => set({ whisperLevel: level }),
}));
