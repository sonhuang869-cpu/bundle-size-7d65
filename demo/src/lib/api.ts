import type { Reconciliation, Exception, ExceptionStatus } from './types';
import { SEED_RECONCILIATIONS, MONTHLY_TRENDS, EXCEPTION_SOURCES } from './seedData';

const STORAGE_KEY = 'recontrace_data';

function loadData(): Reconciliation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Reconciliation[];
  } catch {
    // ignore corrupt data
  }
  return JSON.parse(JSON.stringify(SEED_RECONCILIATIONS)) as Reconciliation[];
}

function saveData(data: Reconciliation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function resetData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function delay(ms = 300): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export async function getReconciliations(): Promise<Reconciliation[]> {
  await delay(200);
  return loadData();
}

export async function getReconciliation(id: string): Promise<Reconciliation | null> {
  await delay(150);
  return loadData().find(r => r.id === id) ?? null;
}

export async function getExceptions(reconciliationId?: string): Promise<Exception[]> {
  await delay(200);
  const data = loadData();
  const all = data.flatMap(r => r.exceptions);
  if (reconciliationId) return all.filter(e => e.reconciliationId === reconciliationId);
  return all;
}

export async function resolveException(
  reconciliationId: string,
  exceptionId: string,
  action: ExceptionStatus,
  options?: { justification?: string; escalatedTo?: string; notes?: string }
): Promise<Exception> {
  await delay(400);
  const data = loadData();
  const recon = data.find(r => r.id === reconciliationId);
  if (!recon) throw new Error('Reconciliation not found');
  const exc = recon.exceptions.find(e => e.id === exceptionId);
  if (!exc) throw new Error('Exception not found');

  exc.status = action;
  exc.updatedAt = new Date().toISOString();
  if (options?.justification) exc.justification = options.justification;
  if (options?.escalatedTo) exc.escalatedTo = options.escalatedTo;
  if (options?.notes) exc.notes = options.notes;
  if (action !== 'pending') {
    exc.resolvedAt = new Date().toISOString();
    exc.resolvedBy = 'Henry Muchori — Sr. Financial Operations';
  }

  if (action === 'approved' || action === 'force-matched') {
    if (exc.transactionA) exc.transactionA.matchStatus = 'matched';
    if (exc.transactionB) exc.transactionB.matchStatus = 'matched';
    recon.matchedItems = recon.matchedItems + (exc.transactionB ? 1 : 0);
    recon.matchRate = parseFloat(((recon.matchedItems / recon.totalItems) * 100).toFixed(1));
  }

  saveData(data);
  return exc;
}

export async function lockReconciliation(id: string): Promise<Reconciliation> {
  await delay(600);
  const data = loadData();
  const recon = data.find(r => r.id === id);
  if (!recon) throw new Error('Reconciliation not found');
  recon.status = 'closed';
  recon.closedAt = new Date().toISOString();
  recon.closedBy = 'Henry Muchori — Sr. Financial Operations';
  saveData(data);
  return recon;
}

export async function getDashboardStats() {
  await delay(100);
  const data = loadData();
  const allExceptions = data.flatMap(r => r.exceptions);
  const openExceptions = allExceptions.filter(e => e.status === 'pending' || e.status === 'escalated');
  const resolvedToday = allExceptions.filter(e => {
    if (!e.resolvedAt) return false;
    const today = new Date().toDateString();
    return new Date(e.resolvedAt).toDateString() === today;
  });

  const resolved24h = openExceptions.filter(e => e.age < 1).length;
  const total = openExceptions.length || 1;

  return {
    totalReconciliations: data.length,
    avgMatchRate: parseFloat((data.reduce((s, r) => s + r.matchRate, 0) / data.length).toFixed(1)),
    openExceptions: openExceptions.length,
    resolvedToday: resolvedToday.length,
    sla24h: parseFloat(((resolved24h / total) * 100).toFixed(1)),
    sla48h: parseFloat(((openExceptions.filter(e => e.age <= 2).length / total) * 100).toFixed(1)),
    sla72h: parseFloat(((openExceptions.filter(e => e.age <= 3).length / total) * 100).toFixed(1)),
  };
}

export const getMonthlyTrends = () => Promise.resolve(MONTHLY_TRENDS);
export const getExceptionSources = () => Promise.resolve(EXCEPTION_SOURCES);
