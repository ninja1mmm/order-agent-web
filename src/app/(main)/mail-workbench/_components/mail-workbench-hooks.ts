"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getInboxMails } from "@/services/inbox";
import { getMailTasks } from "@/services/mail";
import { getEffectiveRows } from "@/services/tasks";
import type { InboxMailListResponse, MailTaskListResponse, WorkspaceMail, WorkspaceStats } from "@/types/models/inbox";
import type { MailTaskSummary } from "@/types/models/inbox";
import type { EffectiveRowsResponse, TaskStaleState } from "@/types/models/tasks";

const POLL_INTERVAL = 15_000;

export type MailListFilters = {
  page?: number;
  size?: number;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useMailList(filters: MailListFilters) {
  const [mails, setMails] = useState<WorkspaceMail[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [page, setPage] = useState(filters.page ?? 1);
  const [loading, setLoading] = useState(true);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async (pageOverride?: number) => {
    try {
      const currentPage = pageOverride ?? page;
      const result: InboxMailListResponse = await getInboxMails({
        page: currentPage,
        size: filtersRef.current.size ?? 50,
        customerId: filtersRef.current.customerId,
        dateFrom: filtersRef.current.dateFrom,
        dateTo: filtersRef.current.dateTo,
      });
      setMails(result.mails);
      setTotal(result.total);
      setStats(result.stats);
    } catch {
      // keep previous state on error
    } finally {
      setLoading(false);
    }
  }, [page, filters.customerId, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = window.setInterval(() => load(), POLL_INTERVAL);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters.customerId, filters.dateFrom, filters.dateTo]);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
    load(newPage);
  }, [load]);

  return { mails, total, stats, page, loading, setPage: changePage, refresh: load };
}

export function useMailTasks(mailId: string | null) {
  const [tasks, setTasks] = useState<MailTaskSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!mailId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const result: MailTaskListResponse = await getMailTasks(mailId);
      setTasks(result.tasks);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [mailId]);

  useEffect(() => {
    load();
  }, [load]);

  return { tasks, loading, refresh: load };
}

export function useTaskRows(taskId: string | null) {
  const [rows, setRows] = useState<Record<string, Record<string, unknown>>>({});
  const [resultRevision, setResultRevision] = useState(1);
  const [taskStaleState, setTaskStaleState] = useState<TaskStaleState>({ pendingReevalSteps: [], staleFieldNames: [] });
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) {
      setRows({});
      setResultRevision(1);
      setTaskStaleState({ pendingReevalSteps: [], staleFieldNames: [] });
      setDeletedRowIds([]);
      return;
    }
    setLoading(true);
    try {
      const result: EffectiveRowsResponse = await getEffectiveRows(taskId);
      setRows(result.rows);
      setResultRevision(result.resultRevision);
      setTaskStaleState(result.taskStaleState);
      setDeletedRowIds(result.deletedRowIds);
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, resultRevision, taskStaleState, deletedRowIds, loading, refresh: load };
}
