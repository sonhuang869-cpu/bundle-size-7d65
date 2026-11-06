export type ConfidenceLevel = 'exact' | 'high' | 'medium' | 'low';
export type ExceptionType = 'missing' | 'amount-diff' | 'timing' | 'duplicate';
export type ExceptionStatus = 'pending' | 'approved' | 'force-matched' | 'written-off' | 'escalated' | 'deferred';
export type ReconciliationStatus = 'active' | 'in-review' | 'closed';
export type MatchStatus = 'matched' | 'unmatched' | 'disputed' | 'written-off';
export type AgingBucket = '<24h' | '1-3d' | '4-7d' | '>7d';

export interface Transaction {
  id: string;
  ref: string;
  description: string;
  amount: number;
  date: string;
  source: 'A' | 'B';
  account?: string;
  vendor?: string;
  matchStatus: MatchStatus;
  matchedWithId?: string;
  confidence?: ConfidenceLevel;
  confidenceScore?: number;
}

export interface MatchedPair {
  id: string;
  transactionA: Transaction;
  transactionB: Transaction;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  matchMethod: 'reference' | 'amount-date' | 'manual';
  amountDiff: number;
  dateDiff: number;
}

export interface Exception {
  id: string;
  reconciliationId: string;
  type: ExceptionType;
  status: ExceptionStatus;
  transactionA?: Transaction;
  transactionB?: Transaction;
  amount: number;
  amountDiff?: number;
  createdAt: string;
  updatedAt: string;
  age: number;
  agingBucket: AgingBucket;
  suggestedMatches: SuggestedMatch[];
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  justification?: string;
  escalatedTo?: string;
}

export interface SuggestedMatch {
  transactionId: string;
  transaction: Transaction;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  reason: string;
}

export interface Reconciliation {
  id: string;
  name: string;
  sourceA: string;
  sourceB: string;
  period: string;
  status: ReconciliationStatus;
  totalItems: number;
  matchedItems: number;
  exceptionCount: number;
  matchRate: number;
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
  transactions: Transaction[];
  matchedPairs: MatchedPair[];
  exceptions: Exception[];
}

export interface DashboardStats {
  totalReconciliations: number;
  avgMatchRate: number;
  openExceptions: number;
  resolvedToday: number;
  sla24h: number;
  sla48h: number;
  sla72h: number;
}

export interface MonthlyTrend {
  month: string;
  matchRate: number;
  exceptions: number;
  resolved: number;
}

export interface ExceptionSource {
  name: string;
  count: number;
  totalAmount: number;
  avgAge: number;
}
