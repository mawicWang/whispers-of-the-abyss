import { create } from 'zustand';

interface BaseSceneState {
  selectedSkill: 'whisper' | null;
  setSelectedSkill: (skill: 'whisper' | null) => void;
}

export const useBaseSceneStore = create<BaseSceneState>((set) => ({
  selectedSkill: null,
  setSelectedSkill: (skill) => set({ selectedSkill: skill }),
}));
