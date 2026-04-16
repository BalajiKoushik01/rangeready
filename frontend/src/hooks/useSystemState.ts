import { useContext } from 'react';
import { SystemStateContext } from '../context/SystemStateContext';

/**
 * useSystemState Hook
 * Extracted into its own file to satisfy React Fast Refresh requirements
 * and prevent invalidation of the entire context on small logic changes.
 */
export const useSystemState = () => {
  const context = useContext(SystemStateContext);
  if (!context) {
    throw new Error('useSystemState must be used within a SystemStateProvider');
  }
  return context;
};
