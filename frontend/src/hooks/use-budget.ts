import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { BudgetSection, loadBudget } from '@/lib/db/budget';
import { getDb } from '@/lib/db/database';

// Sections is null until first load finishes
export function useBudget() {
  const [sections, setSections] = useState<BudgetSection[] | null>(null);

  const reload = useCallback(async () => {
    setSections(await loadBudget(await getDb()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload().catch((e) => console.warn('budget load failed', e));
    }, [reload])
  );

  return { sections, reload };
}