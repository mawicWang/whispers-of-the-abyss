
import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/store';

export const useManaRegen = () => {
  const { addMana } = useGameStore();
  const accumulatedTime = useRef(0);
  const REGEN_INTERVAL = 1000; // Update every second
  const REGEN_AMOUNT_PER_SECOND = 1 / 30; // 1 mana per 30 seconds

  useEffect(() => {
    const interval = setInterval(() => {
        // Since we need partial mana to work (e.g. 1/30), but the store likely holds floats,
        // we can just add 1/30 every second.
        // However, if we want strict "1 mana every 30s", we can do that.
        // The prompt says: "or say 1/30 point per second".
        // We'll update smoothly.
        addMana(REGEN_AMOUNT_PER_SECOND);
    }, REGEN_INTERVAL);

    return () => clearInterval(interval);
  }, [addMana]);
};
