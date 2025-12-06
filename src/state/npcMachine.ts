
import { setup } from 'xstate';

export const npcMachine = setup({
  types: {
    context: {} as { entityId: string },
    events: {} as
      | { type: 'DISTURBANCE' }
      | { type: 'CALM_DOWN' }
      | { type: 'FRIGHTENED' }
  },
}).createMachine({
  id: 'npc',
  initial: 'idle',
  context: { entityId: '' },
  states: {
    idle: {
      on: {
        DISTURBANCE: 'suspicious',
      }
    },
    suspicious: {
      after: {
        2000: 'idle'
      },
      on: {
        FRIGHTENED: 'flee',
      }
    },
    flee: {
      after: {
        5000: 'idle'
      }
    }
  }
});
