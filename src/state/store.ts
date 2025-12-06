
import { create } from 'zustand';

interface GameState {
  mana: number;
  suspicion: number;
  addMana: (amount: number) => void;
  increaseSuspicion: (amount: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  mana: 10,
  suspicion: 0,
  addMana: (amount) => set((state) => ({ mana: state.mana + amount })),
  increaseSuspicion: (amount) => set((state) => ({ suspicion: state.suspicion + amount })),
}));
