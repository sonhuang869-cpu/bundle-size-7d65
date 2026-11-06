import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, CheckCircle2, AlertTriangle, ArrowLeftRight, Filter, ChevronDown } from 'lucide-react';
import { getReconciliations, lockReconciliation } from '@/lib/api';
import { formatCurrency, formatDate, confidenceColor } from '@/lib/utils';
import type { Reconciliation, Transaction, MatchStatus } from '@/lib/types';

type ViewFilter = 'all' | 'matched' | 'unmatched' | 'disputed' | 'written-off';

function TransactionCell({ tx }: { tx: Transaction | null; side: 'A' | 'B' }) {
  if (!tx) {
    return (
      <div className="h-10 flex items-center justify-center">
        <span className="text-xs text-[#5a5a78] italic">— missing —</span>
      </div>
    );
  }
  const matched = tx.matchStatus === 'matched';
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded transition-colors ${
      matched ? 'bg-[#059669]/5' : 'bg-[#dc2626]/5'
    }`}>
      {matched
        ? <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
        : <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono-num text-white truncate">{tx.ref}</div>
        <div className="text-xs text-[#5a5a78] truncate">{tx.vendor}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs font-mono-num text-white">{formatCurrency(tx.amount)}</div>
        <div className="text-xs text-[#5a5a78]">{formatDate(tx.date)}</div>
      </div>
      {matched && tx.confidence && (
        <span className={`text-xs px-1.5 py-0.5 rounded border font-mono-num ${confidenceColor(tx.confidence)}`}>
          {tx.confidenceScore}%
        </span>
      )}
    </div>
  );
}

export function Workspace() {
  const [searchParams] = useSearchParams();
  const reconId = searchParams.get('id');

  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [locking, setLocking] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    getReconciliations().then(r => {
      setReconciliations(r);
      setSelectedId(reconId ?? r[0]?.id ?? '');
      setLoading(false);
    });
  }, [reconId]);

  const recon = reconciliations.find(r => r.id === selectedId) ?? null;

  const matchedPairMap = useMemo(() => {
    if (!recon) return new Map<string, string>();
    const m = new Map<string, string>();
    recon.matchedPairs.forEach(p => {
      m.set(p.transactionA.id, p.transactionB.id);
      m.set(p.transactionB.id, p.transactionA.id);
    });
    return m;
  }, [recon]);

  const rows = useMemo(() => {
    if (!recon) return [];
    const txA = recon.transactions.filter(t => t.source === 'A');
    const txB = recon.transactions.filter(t => t.source === 'B');
    const txBMap = new Map(txB.map(t => [t.id, t]));
    const usedB = new Set<string>();

    const result: { txA: Transaction | null; txB: Transaction | null; status: MatchStatus }[] = [];

    txA.forEach(a => {
      const bId = matchedPairMap.get(a.id);
      const b = bId ? txBMap.get(bId) : undefined;
      if (b) usedB.add(b.id);
      result.push({ txA: a, txB: b ?? null, status: a.matchStatus });
    });

    txB.forEach(b => {
      if (!usedB.has(b.id)) {
        result.push({ txA: null, txB: b, status: b.matchStatus });
      }
    });

    return result;
  }, [recon, matchedPairMap]);

  const filtered = useMemo(() => {
    if (viewFilter === 'all') return rows;
    return rows.filter(r => {
      const s = r.txA?.matchStatus ?? r.txB?.matchStatus;
      return s === viewFilter;
    });
  }, [rows, viewFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleLock = async () => {
    if (!recon) return;
    setLocking(true);
    try {
      await lockReconciliation(recon.id);
      const updated = await getReconciliations();
      setReconciliations(updated);
      toast.success(`${recon.name} — period locked and sign-off record generated`);
    } finally {
      setLocking(false);
      setShowLockConfirm(false);
    }
  };

  if (loading) return <div className="p-6"><div className="h-96 skeleton rounded-xl" /></div>;

  return (
    <div className="p-6 max-w-[1500px] mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Reconciliation Workspace</h1>
          <p className="text-sm text-[#5a5a78] mt-0.5">Side-by-side ledger view</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Dataset selector */}
          <div className="relative">
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setPage(0); setViewFilter('all'); }}
              className="appearance-none bg-[#111118] border border-[#2a2a3e] text-white text-sm px-3 py-1.5 pr-8 rounded-lg cursor-pointer outline-none focus:border-[#7c3aed]"
            >
              {reconciliations.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5a5a78] pointer-events-none" />
          </div>

          {recon && recon.status !== 'closed' && (
            <button
              onClick={() => setShowLockConfirm(true)}
              disabled={locking}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] hover:bg-[#22223a] border border-[#2a2a3e] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Lock size={13} />
              Lock Period
            </button>
          )}
          {recon?.status === 'closed' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-medium rounded-lg">
              <Lock size={13} />
              Period Locked · {formatDate(recon.closedAt!)}
            </div>
          )}
        </div>
      </div>

      {recon && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-[#111118] border border-[#1e1e30] rounded-xl px-4 py-3">
              <div className="text-xs text-[#5a5a78] mb-1">Total Items</div>
              <div className="text-xl font-mono-num font-semibold text-white">{recon.totalItems}</div>
            </div>
            <div className="bg-[#111118] border border-[#1e1e30] rounded-xl px-4 py-3">
              <div className="text-xs text-[#5a5a78] mb-1">Matched</div>
              <div className="text-xl font-mono-num font-semibold text-emerald-400">{recon.matchedItems}</div>
            </div>
            <div className="bg-[#111118] border border-[#1e1e30] rounded-xl px-4 py-3">
              <div className="text-xs text-[#5a5a78] mb-1">Unmatched</div>
              <div className="text-xl font-mono-num font-semibold text-red-400">
                {recon.transactions.filter(t => t.source === 'A' && t.matchStatus === 'unmatched').length}
              </div>
            </div>
            <div className="bg-[#111118] border border-[#1e1e30] rounded-xl px-4 py-3">
              <div className="text-xs text-[#5a5a78] mb-1">Match Rate</div>
              <div className="text-xl font-mono-num font-semibold text-white">{recon.matchRate.toFixed(1)}%</div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-4">
            <Filter size={13} className="text-[#5a5a78]" />
            {(['all', 'matched', 'unmatched', 'disputed', 'written-off'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setViewFilter(f); setPage(0); }}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  viewFilter === f
                    ? 'bg-[#7c3aed]/20 text-white border border-[#7c3aed]/40'
                    : 'text-[#9898b0] hover:text-white hover:bg-[#1a1a2e] border border-transparent'
                }`}
              >
                {f === 'all' ? `All (${rows.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${rows.filter(r => (r.txA?.matchStatus ?? r.txB?.matchStatus) === f).length})`}
              </button>
            ))}
            <span className="ml-auto text-xs text-[#5a5a78]">{filtered.length} rows · page {page + 1}/{totalPages || 1}</span>
          </div>

          {/* Split panel */}
          <div className="bg-[#111118] border border-[#1e1e30] rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_40px_1fr] border-b border-[#1e1e30]">
              <div className="px-4 py-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
                <span className="text-xs font-semibold text-[#7c3aed] uppercase tracking-wide">{recon.sourceA}</span>
              </div>
              <div className="border-x border-[#1e1e30] flex items-center justify-center">
                <ArrowLeftRight size={13} className="text-[#5a5a78]" />
              </div>
              <div className="px-4 py-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#059669]" />
                <span className="text-xs font-semibold text-[#059669] uppercase tracking-wide">{recon.sourceB}</span>
              </div>
            </div>

            {/* Sub-headers */}
            <div className="grid grid-cols-[1fr_40px_1fr] border-b border-[#1e1e30] bg-[#0d0d1a]">
              {['Reference / Vendor / Amount / Date / Conf.', '', 'Reference / Vendor / Amount / Date / Conf.'].map((h, i) => (
                <div key={i} className={`px-4 py-2 text-xs text-[#5a5a78] ${i === 1 ? 'border-x border-[#1e1e30]' : ''}`}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#1e1e30]/40">
              {paged.map((row, i) => {
                const isMatched = row.txA?.matchStatus === 'matched' || row.txB?.matchStatus === 'matched';
                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[1fr_40px_1fr] transition-colors ${
                      isMatched ? 'hover:bg-[#059669]/5' : 'hover:bg-[#dc2626]/5'
                    }`}
                  >
                    <div className="px-3 py-2">
                      <TransactionCell tx={row.txA} side="A" />
                    </div>
                    <div className="border-x border-[#1e1e30] flex items-center justify-center">
                      {isMatched
                        ? <div className="w-px h-4 bg-[#059669]/50" />
                        : <div className="w-1 h-1 rounded-full bg-[#dc2626]/50" />}
                    </div>
                    <div className="px-3 py-2">
                      <TransactionCell tx={row.txB} side="B" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-[#1e1e30]">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-xs text-[#9898b0] border border-[#2a2a3e] rounded-md hover:border-[#3a3a55] disabled:opacity-40"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 text-xs rounded-md ${p === page ? 'bg-[#7c3aed] text-white' : 'text-[#9898b0] hover:bg-[#1a1a2e]'}`}
                      >
                        {p + 1}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 text-xs text-[#9898b0] border border-[#2a2a3e] rounded-md hover:border-[#3a3a55] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {recon.closedAt && (
            <div className="mt-4 bg-emerald-400/5 border border-emerald-400/20 rounded-xl px-5 py-4">
              <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium mb-1">
                <Lock size={14} />
                Sign-off Record
              </div>
              <div className="text-xs text-[#9898b0]">
                Period locked by <span className="text-white">{recon.closedBy}</span> on {formatDate(recon.closedAt)}.
                {' '}Match rate at close: <span className="font-mono-num text-white">{recon.matchRate.toFixed(1)}%</span>.
                {' '}{recon.matchedItems} of {recon.totalItems} items reconciled.
              </div>
            </div>
          )}
        </>
      )}

      {/* Lock confirmation modal */}
      {showLockConfirm && recon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl w-full max-w-sm p-6 fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={18} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Lock Period</h3>
            </div>
            <p className="text-xs text-[#9898b0] mb-1">
              You are about to lock <span className="text-white">{recon.name}</span> for period <span className="text-white">{recon.period}</span>.
            </p>
            <p className="text-xs text-[#9898b0] mb-4">
              This marks the period as closed, prevents further edits, and generates a sign-off record.
            </p>
            {recon.exceptionCount > 0 && (
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 mb-4 text-xs text-amber-400">
                Warning: {recon.exceptionCount} open exception{recon.exceptionCount !== 1 ? 's' : ''} will be carried forward.
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowLockConfirm(false)} className="flex-1 px-3 py-2 text-xs font-medium text-[#9898b0] bg-[#111118] border border-[#2a2a3e] rounded-lg">Cancel</button>
              <button onClick={handleLock} disabled={locking} className="flex-1 px-3 py-2 text-xs font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg disabled:opacity-50 transition-colors">
                {locking ? 'Locking…' : 'Confirm Lock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
