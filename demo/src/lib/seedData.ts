import type { Reconciliation, Transaction, MatchedPair, Exception } from './types';

const vendors = [
  'Meridian Capital Partners', 'Westfield Group Holdings', 'Apex Financial Services',
  'Northgate Securities Ltd', 'Clearwater Asset Management', 'Sterling Bridge Corp',
  'Ironwood Investments', 'Redwood Financial Group', 'Pinnacle Trust Co',
  'Harborview Capital', 'Blackstone Advisory', 'Vanguard Credit Union',
  'Summit Financial LLC', 'Crestwood Banking', 'Atlantic Merchant Services',
  'Pacific Rim Finance', 'Highland Investment Group', 'Riverside Asset Co',
];

function makeRef(prefix: string, n: number) {
  return `${prefix}-2026-${String(n).padStart(4, '0')}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function randomAmount(min: number, max: number, decimals = 2): number {
  const v = min + Math.random() * (max - min);
  return parseFloat(v.toFixed(decimals));
}

function ageBucket(age: number): Exception['agingBucket'] {
  if (age < 1) return '<24h';
  if (age <= 3) return '1-3d';
  if (age <= 7) return '4-7d';
  return '>7d';
}

// ───────────── Dataset 1: Bank vs GL ─────────────
// 143 items, 96% matched → 137 matched, 6 exceptions

function buildBankVsGL(): Reconciliation {
  const id = 'recon-001';
  const transactions: Transaction[] = [];
  const matchedPairs: MatchedPair[] = [];
  const exceptions: Exception[] = [];

  const startDate = '2026-10-01';

  // 137 matched pairs
  for (let i = 1; i <= 137; i++) {
    const ref = makeRef('INV', 1000 + i);
    const amount = randomAmount(400, 85000);
    const dateA = addDays(startDate, Math.floor(Math.random() * 30));
    const dateB = addDays(dateA, Math.random() < 0.8 ? 0 : 1);
    const amountB = Math.random() < 0.95 ? amount : parseFloat((amount + (Math.random() * 0.02 - 0.01)).toFixed(2));
    const vendor = vendors[i % vendors.length];

    const txA: Transaction = {
      id: `txA-${id}-${i}`,
      ref,
      description: `${vendor} — payment ref ${ref}`,
      amount,
      date: dateA,
      source: 'A',
      account: `GL-${4000 + (i % 20)}`,
      vendor,
      matchStatus: 'matched',
      matchedWithId: `txB-${id}-${i}`,
      confidence: amountB === amount && dateA === dateB ? 'exact' : (Math.abs(amount - amountB) < 0.02 ? 'high' : 'medium'),
      confidenceScore: amountB === amount && dateA === dateB ? 100 : (Math.abs(amount - amountB) < 0.02 ? 97 : 88),
    };
    const txB: Transaction = {
      id: `txB-${id}-${i}`,
      ref,
      description: `Bank credit — ${ref}`,
      amount: amountB,
      date: dateB,
      source: 'B',
      account: `BANK-CHK-001`,
      vendor,
      matchStatus: 'matched',
      matchedWithId: `txA-${id}-${i}`,
      confidence: txA.confidence,
      confidenceScore: txA.confidenceScore,
    };
    transactions.push(txA, txB);
    matchedPairs.push({
      id: `pair-${id}-${i}`,
      transactionA: txA,
      transactionB: txB,
      confidence: txA.confidence!,
      confidenceScore: txA.confidenceScore!,
      matchMethod: amountB === amount && dateA === dateB ? 'reference' : 'amount-date',
      amountDiff: parseFloat(Math.abs(amount - amountB).toFixed(2)),
      dateDiff: Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime()) / 86400000,
    });
  }

  // 6 exceptions
  const excData = [
    { type: 'missing' as const, age: 2, amount: 12450.00, vendor: 'Meridian Capital Partners', ref: makeRef('INV', 2001), hasB: false },
    { type: 'amount-diff' as const, age: 5, amount: 34280.50, vendor: 'Westfield Group Holdings', ref: makeRef('INV', 2002), hasB: true, amountDiff: 150.25 },
    { type: 'timing' as const, age: 1, amount: 8750.00, vendor: 'Apex Financial Services', ref: makeRef('INV', 2003), hasB: true, amountDiff: 0 },
    { type: 'missing' as const, age: 8, amount: 61200.00, vendor: 'Northgate Securities Ltd', ref: makeRef('INV', 2004), hasB: false },
    { type: 'amount-diff' as const, age: 3, amount: 4320.75, vendor: 'Clearwater Asset Management', ref: makeRef('INV', 2005), hasB: true, amountDiff: 7.50 },
    { type: 'duplicate' as const, age: 0.5, amount: 22100.00, vendor: 'Sterling Bridge Corp', ref: makeRef('INV', 2006), hasB: true, amountDiff: 22100.00 },
  ];

  excData.forEach((e, idx) => {
    const txA: Transaction = {
      id: `txA-exc-${id}-${idx}`,
      ref: e.ref,
      description: `${e.vendor} — payment ref ${e.ref}`,
      amount: e.amount,
      date: addDays('2026-10-28', -e.age),
      source: 'A',
      account: `GL-${4010 + idx}`,
      vendor: e.vendor,
      matchStatus: 'unmatched',
    };
    const txB: Transaction | undefined = e.hasB ? {
      id: `txB-exc-${id}-${idx}`,
      ref: e.ref,
      description: `Bank entry — ${e.ref}`,
      amount: e.type === 'amount-diff' ? e.amount + (e.amountDiff ?? 0) : e.amount,
      date: e.type === 'timing' ? addDays(txA.date, 2) : txA.date,
      source: 'B',
      account: 'BANK-CHK-001',
      vendor: e.vendor,
      matchStatus: 'unmatched',
    } : undefined;

    if (txB) transactions.push(txB);
    transactions.push(txA);

    const exc: Exception = {
      id: `exc-${id}-${idx}`,
      reconciliationId: id,
      type: e.type,
      status: 'pending',
      transactionA: txA,
      transactionB: txB,
      amount: e.amount,
      amountDiff: e.amountDiff ?? 0,
      createdAt: addDays('2026-10-30', -e.age),
      updatedAt: addDays('2026-10-30', -e.age),
      age: e.age,
      agingBucket: ageBucket(e.age),
      suggestedMatches: txB ? [{
        transactionId: txB.id,
        transaction: txB,
        confidence: e.type === 'timing' ? 'high' : (e.type === 'amount-diff' ? 'medium' : 'low'),
        confidenceScore: e.type === 'timing' ? 92 : (e.type === 'amount-diff' ? 81 : 65),
        reason: e.type === 'timing' ? 'Same ref, 2-day timing difference' : (e.type === 'amount-diff' ? `Amount differs by $${e.amountDiff}` : 'Potential duplicate entry'),
      }] : [],
    };
    exceptions.push(exc);
  });

  return {
    id,
    name: 'Bank Statement vs General Ledger',
    sourceA: 'General Ledger (ERP)',
    sourceB: 'Bank Statement — CHK-001',
    period: 'October 2026',
    status: 'active',
    totalItems: 143,
    matchedItems: 137,
    exceptionCount: 6,
    matchRate: 95.8,
    createdAt: '2026-11-01T08:00:00Z',
    transactions,
    matchedPairs,
    exceptions,
  };
}

// ───────────── Dataset 2: AR Subledger vs Trial Balance ─────────────
// 89 items, 91% matched → 81 matched, 8 exceptions

function buildARvsTrialBalance(): Reconciliation {
  const id = 'recon-002';
  const transactions: Transaction[] = [];
  const matchedPairs: MatchedPair[] = [];
  const exceptions: Exception[] = [];

  const customers = [
    'Ironwood Investments', 'Redwood Financial Group', 'Pinnacle Trust Co',
    'Harborview Capital', 'Blackstone Advisory', 'Vanguard Credit Union',
    'Summit Financial LLC', 'Crestwood Banking',
  ];

  for (let i = 1; i <= 81; i++) {
    const ref = makeRef('AR', 3000 + i);
    const amount = randomAmount(1200, 55000);
    const dateA = addDays('2026-10-01', Math.floor(Math.random() * 30));
    const vendor = customers[i % customers.length];
    const conf = Math.random() > 0.1 ? 'exact' : 'high';

    const txA: Transaction = {
      id: `txA-${id}-${i}`,
      ref,
      description: `Receivable — ${vendor} invoice ${ref}`,
      amount,
      date: dateA,
      source: 'A',
      account: `AR-${1200 + (i % 10)}`,
      vendor,
      matchStatus: 'matched',
      matchedWithId: `txB-${id}-${i}`,
      confidence: conf,
      confidenceScore: conf === 'exact' ? 100 : 96,
    };
    const txB: Transaction = {
      id: `txB-${id}-${i}`,
      ref,
      description: `Trial Balance entry — ${ref}`,
      amount,
      date: dateA,
      source: 'B',
      account: `TB-AR-${1200 + (i % 10)}`,
      vendor,
      matchStatus: 'matched',
      matchedWithId: `txA-${id}-${i}`,
      confidence: conf,
      confidenceScore: conf === 'exact' ? 100 : 96,
    };
    transactions.push(txA, txB);
    matchedPairs.push({
      id: `pair-${id}-${i}`,
      transactionA: txA,
      transactionB: txB,
      confidence: conf,
      confidenceScore: conf === 'exact' ? 100 : 96,
      matchMethod: 'reference',
      amountDiff: 0,
      dateDiff: 0,
    });
  }

  const excData = [
    { type: 'missing' as const, age: 4, amount: 18500.00, vendor: 'Atlantic Merchant Services', ref: makeRef('AR', 4001) },
    { type: 'amount-diff' as const, age: 2, amount: 7340.00, vendor: 'Pacific Rim Finance', ref: makeRef('AR', 4002), amountDiff: 340.00 },
    { type: 'missing' as const, age: 9, amount: 42100.50, vendor: 'Highland Investment Group', ref: makeRef('AR', 4003) },
    { type: 'timing' as const, age: 1, amount: 3850.25, vendor: 'Riverside Asset Co', ref: makeRef('AR', 4004) },
    { type: 'amount-diff' as const, age: 6, amount: 11200.00, vendor: 'Ironwood Investments', ref: makeRef('AR', 4005), amountDiff: 1200.00 },
    { type: 'missing' as const, age: 3, amount: 28750.00, vendor: 'Summit Financial LLC', ref: makeRef('AR', 4006) },
    { type: 'duplicate' as const, age: 0.3, amount: 5900.00, vendor: 'Crestwood Banking', ref: makeRef('AR', 4007) },
    { type: 'amount-diff' as const, age: 7, amount: 9100.00, vendor: 'Vanguard Credit Union', ref: makeRef('AR', 4008), amountDiff: 100.00 },
  ];

  excData.forEach((e, idx) => {
    const txA: Transaction = {
      id: `txA-exc-${id}-${idx}`,
      ref: e.ref,
      description: `Receivable — ${e.vendor} invoice ${e.ref}`,
      amount: e.amount,
      date: addDays('2026-10-28', -e.age),
      source: 'A',
      account: `AR-${1210 + idx}`,
      vendor: e.vendor,
      matchStatus: 'unmatched',
    };
    const txB: Transaction | undefined = e.type !== 'missing' ? {
      id: `txB-exc-${id}-${idx}`,
      ref: e.ref,
      description: `TB entry — ${e.ref}`,
      amount: e.type === 'amount-diff' ? e.amount + ((e as any).amountDiff ?? 0) : e.amount,
      date: e.type === 'timing' ? addDays(txA.date, 3) : txA.date,
      source: 'B',
      account: `TB-AR-${1210 + idx}`,
      vendor: e.vendor,
      matchStatus: 'unmatched',
    } : undefined;

    if (txB) transactions.push(txB);
    transactions.push(txA);

    exceptions.push({
      id: `exc-${id}-${idx}`,
      reconciliationId: id,
      type: e.type,
      status: idx < 2 ? 'pending' : idx < 4 ? 'escalated' : 'pending',
      transactionA: txA,
      transactionB: txB,
      amount: e.amount,
      amountDiff: (e as any).amountDiff ?? 0,
      createdAt: addDays('2026-10-30', -e.age),
      updatedAt: addDays('2026-10-30', -e.age),
      age: e.age,
      agingBucket: ageBucket(e.age),
      suggestedMatches: txB ? [{
        transactionId: txB.id,
        transaction: txB,
        confidence: 'medium',
        confidenceScore: 82,
        reason: 'Partial reference match',
      }] : [],
      escalatedTo: idx >= 2 && idx < 4 ? 'Sarah Okonkwo — Mgr, Financial Controls' : undefined,
    });
  });

  return {
    id,
    name: 'AR Subledger vs Trial Balance',
    sourceA: 'Accounts Receivable Subledger',
    sourceB: 'Trial Balance — Period Close',
    period: 'October 2026',
    status: 'in-review',
    totalItems: 89,
    matchedItems: 81,
    exceptionCount: 8,
    matchRate: 91.0,
    createdAt: '2026-11-02T09:00:00Z',
    transactions,
    matchedPairs,
    exceptions,
  };
}

// ───────────── Dataset 3: Intercompany ─────────────
// 56 items, 100% matched, closed

function buildIntercompany(): Reconciliation {
  const id = 'recon-003';
  const transactions: Transaction[] = [];
  const matchedPairs: MatchedPair[] = [];

  const entities = ['Apex Holdings Ltd', 'Apex EMEA BV', 'Apex Americas Inc', 'Apex APAC Pte'];

  for (let i = 1; i <= 56; i++) {
    const ref = makeRef('IC', 5000 + i);
    const amount = randomAmount(5000, 120000);
    const dateA = addDays('2026-09-01', Math.floor(Math.random() * 28));
    const entityA = entities[i % 4];
    const entityB = entities[(i + 1) % 4];

    const txA: Transaction = {
      id: `txA-${id}-${i}`,
      ref,
      description: `Interco transfer — ${entityA} to ${entityB} ${ref}`,
      amount,
      date: dateA,
      source: 'A',
      account: `IC-${3100 + (i % 8)}`,
      vendor: entityA,
      matchStatus: 'matched',
      matchedWithId: `txB-${id}-${i}`,
      confidence: 'exact',
      confidenceScore: 100,
    };
    const txB: Transaction = {
      id: `txB-${id}-${i}`,
      ref,
      description: `Interco receipt — ${entityB} from ${entityA} ${ref}`,
      amount,
      date: dateA,
      source: 'B',
      account: `IC-${3200 + (i % 8)}`,
      vendor: entityB,
      matchStatus: 'matched',
      matchedWithId: `txA-${id}-${i}`,
      confidence: 'exact',
      confidenceScore: 100,
    };
    transactions.push(txA, txB);
    matchedPairs.push({
      id: `pair-${id}-${i}`,
      transactionA: txA,
      transactionB: txB,
      confidence: 'exact',
      confidenceScore: 100,
      matchMethod: 'reference',
      amountDiff: 0,
      dateDiff: 0,
    });
  }

  return {
    id,
    name: 'Intercompany Eliminations',
    sourceA: 'Apex Holdings Ltd — Entity Ledger',
    sourceB: 'Counterparty Subledgers',
    period: 'September 2026',
    status: 'closed',
    totalItems: 56,
    matchedItems: 56,
    exceptionCount: 0,
    matchRate: 100,
    createdAt: '2026-10-05T10:00:00Z',
    closedAt: '2026-10-10T14:30:00Z',
    closedBy: 'James Mwangi — Financial Controller',
    transactions,
    matchedPairs,
    exceptions: [],
  };
}

export const SEED_RECONCILIATIONS: Reconciliation[] = [
  buildBankVsGL(),
  buildARvsTrialBalance(),
  buildIntercompany(),
];

export const MONTHLY_TRENDS = [
  { month: 'May 2026', matchRate: 88.4, exceptions: 24, resolved: 20 },
  { month: 'Jun 2026', matchRate: 90.2, exceptions: 19, resolved: 17 },
  { month: 'Jul 2026', matchRate: 91.7, exceptions: 15, resolved: 14 },
  { month: 'Aug 2026', matchRate: 93.1, exceptions: 12, resolved: 12 },
  { month: 'Sep 2026', matchRate: 94.8, exceptions: 8, resolved: 8 },
  { month: 'Oct 2026', matchRate: 95.3, exceptions: 14, resolved: 8 },
];

export const EXCEPTION_SOURCES = [
  { name: 'Timing differences (1–2 days)', count: 6, totalAmount: 128450.25, avgAge: 1.8 },
  { name: 'Amount discrepancies < $500', count: 5, totalAmount: 47890.00, avgAge: 3.2 },
  { name: 'Missing counterpart entries', count: 4, totalAmount: 162000.50, avgAge: 5.6 },
  { name: 'Amount discrepancies > $500', count: 3, totalAmount: 95200.00, avgAge: 4.1 },
  { name: 'Duplicate entries', count: 2, totalAmount: 28000.00, avgAge: 0.4 },
];
