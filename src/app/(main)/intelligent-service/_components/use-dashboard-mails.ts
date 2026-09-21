"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getInboxMails, type WorkspaceMail, type WorkspaceStats } from "@/services/inbox";
import type { InboxMailListRequestParams } from "@/types/schemas/inbox";

const PAGE_SIZE = 20;

export function useDashboardMails(filters: Omit<InboxMailListRequestParams, "page" | "size">) {
  const [mails, setMails] = useState<WorkspaceMail[]>([]);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestVersionRef = useRef(0);
  const filterKey = JSON.stringify(filters);

  const loadPage = useCallback(async (requestedPage: number, append: boolean) => {
    const version = ++requestVersionRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (append) setLoadingMore(true);
    else {
      setMails([]);
      setPage(0);
      setTotal(0);
      setError(null);
      setLoading(true);
    }

    try {
      const response = await getInboxMails(
        { ...filters, page: requestedPage, size: PAGE_SIZE },
        controller.signal,
      );
      if (controller.signal.aborted || version !== requestVersionRef.current) return;
      setMails((current) => {
        if (!append) return response.mails;
        const known = new Set(current.map((mail) => mail.id));
        return [...current, ...response.mails.filter((mail) => !known.has(mail.id))];
      });
      setStats(response.stats);
      setPage(response.page);
      setTotal(response.total);
      setError(null);
    } catch (reason) {
      if (controller.signal.aborted || version !== requestVersionRef.current) return;
      setError(reason instanceof Error ? reason.message : "Load failed");
    } finally {
      if (!controller.signal.aborted && version === requestVersionRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  // filterKey represents the complete serializable API query.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPage(1, false), 0);
    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [loadPage]);

  const refresh = useCallback(() => loadPage(1, false), [loadPage]);
  const loadMore = useCallback(() => {
    if (loading || loadingMore || mails.length >= total) return Promise.resolve();
    return loadPage(page + 1, true);
  }, [loadPage, loading, loadingMore, mails.length, page, total]);

  return {
    mails,
    stats,
    total,
    loading,
    loadingMore,
    error,
    hasMore: mails.length < total,
    refresh,
    loadMore,
  };
}
