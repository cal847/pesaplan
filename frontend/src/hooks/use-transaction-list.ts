import { useCallback, useEffect, useRef, useState } from 'react';

import { getDb } from '@/lib/db/database';
import {
  listTransactions,
  type StoredTransaction,
} from '@/lib/db/transactions';
import { useDataStore } from '@/stores/data-store';

type PageCursor = {
  occurredAt: string;
  createdAt: number;
  id: string;
};

const PAGE = 30;

export type TransactionDateRange = {
  from?: string;
  to?: string;
};

export function useTransactionList(
  range: TransactionDateRange,
  search: string,
  simKey: string | null
) {
  const dataVersion = useDataStore((s) => s.version);

  const [rows, setRows] = useState<StoredTransaction[]>([]);
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const generation = useRef(0);
  const cursor = useRef<PageCursor | null>(null);
  const exhausted = useRef(false);
  const busy = useRef(false);
  const latest = useRef({ range, search, simKey });

  latest.current = { range, search, simKey };

  const load = useCallback(async (reset: boolean) => {
    if (!reset && (busy.current || exhausted.current)) {
      return;
    }

    const generationForRequest = reset
      ? ++generation.current
      : generation.current;

    busy.current = true;

    if (reset) {
      cursor.current = null;
      exhausted.current = false;
      setRefreshing(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { range: currentRange, search: currentSearch, simKey: currentSimKey } =
        latest.current;

      const page = await listTransactions(await getDb(), {
        from: currentRange.from,
        to: currentRange.to,
        search: currentSearch || undefined,
        simKey: currentSimKey,
        limit: PAGE,
      });

      if (generationForRequest !== generation.current) {
        return;
      }

      const last = page[page.length - 1];

      if (last) {
        cursor.current = {
          occurredAt: last.occurredAt,
          createdAt: last.createdAt,
          id: last.id,
        };
      }

      exhausted.current = page.length < PAGE;

      setRows((previous) =>
        reset ? page : [...previous, ...page]
      );

      setStatus('ready');
    } catch (error) {
      if (generationForRequest === generation.current) {
        console.warn('transactions load failed', error);
        setStatus('error');
      }
    } finally {
      if (generationForRequest === generation.current) {
        busy.current = false;
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const rangeKey = `${range.from ?? ''}|${range.to ?? ''}`;

  useEffect(() => {
    void load(true);
  }, [load, rangeKey, search, simKey, dataVersion]);

  return {
    rows,
    status,
    refreshing,
    loadingMore,
    exhausted: exhausted.current,
    loadMore: () => load(false),
    retry: () => load(true),
    queryKey: `${rangeKey}|${search}|${simKey}`,
  };
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), ms);

    return () => clearTimeout(timeout);
  }, [value, ms]);

  return debounced;
}