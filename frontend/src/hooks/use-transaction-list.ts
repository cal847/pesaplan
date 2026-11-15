import { useCallback, useEffect, useRef, useState } from 'react';

import { getDb } from '@/lib/db/database';
import { listTransactions, StoredTransaction } from '@/lib/db/transactions';
import { periodBounds } from '@/lib/period';
import { toLocalStamp } from '@/lib/time';
import { useDataStore } from '@/stores/data-store';

type PageCursor = {
    occurredAt: string;
    createdAt: number;
    id: string
};

const PAGE =30;

export type RangeFilter =
  | { kind: 'all' | 'today' | 'month' | 'year' }
  | { kind: 'custom'; from: Date; to: Date };

function resolveBounds(range: RangeFilter): { from?: string; to?: string } {
  switch (range.kind) {
    case 'all': return {};
    case 'today': return periodBounds('Daily');
    case 'month': return periodBounds('Monthly');
    case 'year': return periodBounds('Yearly');
    case 'custom': {
      const from = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
      const to = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate() + 1);
      return { from: toLocalStamp(from), to: toLocalStamp(to) };
    }
  }
}

export function useTransactionList(range: RangeFilter, search: string, simKey: string | null) {
  const dataVersion = useDataStore((s) => s.version);
  const [rows, setRows] = useState<StoredTransaction[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const generation = useRef(0);
  const cursor = useRef<PageCursor | null>(null);
  const exhausted = useRef(false);
  const busy = useRef(false);
  const latest = useRef({ range, search, simKey });
  latest.current = { range, search, simKey };

  const load = useCallback(async (reset: boolean) => {
    if (!reset && (busy.current || exhausted.current)) return;
    const gen = reset ? ++generation.current : generation.current;
    busy.current = true;
    if (reset) {
      cursor.current = null;
      exhausted.current = false;
      setRefreshing(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { range, search, simKey } = latest.current;
      const page = await listTransactions(await getDb(), {
        ...resolveBounds(range),
        search: search || undefined,
        simKey,
        // after: cursor.current,
        limit: PAGE,
      });
      if (gen !== generation.current) return; // a newer query took over

      const last = page[page.length - 1];
      if (last) cursor.current = { occurredAt: last.occurredAt, createdAt: last.createdAt, id: last.id };
      exhausted.current = page.length < PAGE;
      setRows((prev) => (reset ? page : [...prev, ...page]));
      setStatus('ready');
    } catch (error) {
      if (gen === generation.current) {
        console.warn('transactions load failed', error);
        setStatus('error');
      }
    } finally {
      if (gen === generation.current) {
        busy.current = false;
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const rangeKey =
    range.kind === 'custom' ? `c${range.from.getTime()}-${range.to.getTime()}` : range.kind;

  useEffect(() => {
    void load(true);
  }, [load, rangeKey, search, simKey, dataVersion]);

  return {
    rows,
    status,
    refreshing,
    loadingMore,
    loadMore: () => load(false),
    retry: () => load(true),
    queryKey: `${rangeKey}|${search}|${simKey}`,
  };
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}