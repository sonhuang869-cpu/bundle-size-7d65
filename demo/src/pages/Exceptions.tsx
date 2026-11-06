import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CheckCircle2, ChevronUp, ArrowUpDown,
  Filter, ChevronRight, X, User
} from 'lucide-react';
import { getExceptions, resolveException } from '@/lib/api';
import {
  formatCurrency, formatDate, agingBucketColor,
  exceptionTypeLabel, statusColor
} from '@/lib/utils';
import type { Exception, ExceptionStatus } from '@/lib/types';

type SortField = 'amount' | 'age' | 'type' | 'status';
type SortDir = 'asc' | 'desc';

function JustificationModal({
  action, onConfirm, onCancel
}: {
  action: ExceptionStatus;
  onConfirm: (justification?: string, escalatedTo?: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const [escalatedTo, setEscalatedTo] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl w-full max-w-md p-6 fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            {action === 'force-matched' ? 'Force Match — Justification Required' :
             action === 'escalated' ? 'Escalate Exception' :
             action === 'written-off' ? 'Write-off Confirmation' : 'Confirm Action'}
          </h3>
          <button onClick={onCancel} className="text-[#5a5a78] hover:text-white">
            <X size={16} />
          </button>
        </div>
        {action === 'escalated' && (
          <div className="mb-3">
            <label className="text-xs text-[#9898b0] mb-1.5 block">Escalate to</label>
            <input
              className="w-full bg-[#111118] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-[#5a5a78] outline-none focus:border-[#7c3aed]"
              placeholder="Manager / reviewer name"
              value={escalatedTo}
              onChange={e => setEscalatedTo(e.target.value)}
            />
          </div>
        )}
        <div className="mb-4">
          <label className="text-xs text-[#9898b0] mb-1.5 block">
            {action === 'force-matched' ? 'Justification' : 'Notes'} {action === 'force-matched' ? '(required)' : '(optional)'}
          </label>
          <textarea
            className="w-full bg-[#111118] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-[#5a5a78] outline-none focus:border-[#7c3aed] resize-none"
            rows={3}
            placeholder={
              action === 'force-matched' ? 'Explain why this match is being forced...' :
              action === 'written-off' ? 'Reason for write-off...' :
              'Add notes...'
            }
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>
        {action === 'written-off' && (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 mb-4 text-xs text-amber-400">
            Write-off threshold: items &lt; $10. Confirm this meets policy.
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 text-xs font-medium text-[#9898b0] bg-[#111118] border border-[#2a2a3e] rounded-lg hover:border-[#3a3a55]"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(text || undefined, escalatedTo || undefined)}
            disabled={action === 'force-matched' && !text.trim()}
            className="flex-1 px-3 py-2 text-xs font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function ExceptionRow({ exc, onAction, expanded, onToggle }: {
  exc: Exception;
  onAction: (exc: Exception, action: ExceptionStatus) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isResolved = exc.status !== 'pending' && exc.status !== 'escalated';

  return (
    <>
      <tr
        className={`border-b border-[#1e1e30]/50 cursor-pointer transition-colors ${
          expanded ? 'bg-[#1a1a2e]' : 'hover:bg-[#111118]'
        }`}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${agingBucketColor(exc.agingBucket)}`}>
            {exc.agingBucket}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-white font-medium">
            {exc.transactionA?.ref || exc.transactionB?.ref || exc.id}
          </div>
          <div className="text-xs text-[#5a5a78] mt-0.5">
            {exc.transactionA?.vendor || exc.transactionB?.vendor}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-[#9898b0] bg-[#1a1a2e] border border-[#2a2a3e] px-2 py-0.5 rounded">
            {exceptionTypeLabel(exc.type)}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="font-mono-num text-sm text-white">{formatCurrency(exc.amount)}</div>
          {exc.amountDiff !== undefined && exc.amountDiff > 0 && (
            <div className="font-mono-num text-xs text-red-400 mt-0.5">Δ {formatCurrency(exc.amountDiff)}</div>
          )}
        </td>
        <td className="px-4 py-3 text-xs font-mono-num text-[#9898b0]">{formatDate(exc.createdAt)}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusColor(exc.status)}`}>
            {exc.status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
            {!isResolved && (
              <>
                <button
                  onClick={() => onAction(exc, 'approved')}
                  className="px-2 py-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/20 rounded transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => onAction(exc, 'force-matched')}
                  className="px-2 py-1 text-xs font-medium text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 rounded transition-colors"
                >
                  Force
                </button>
                <button
                  onClick={() => onAction(exc, 'escalated')}
                  className="px-2 py-1 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded transition-colors"
                >
                  Escalate
                </button>
              </>
            )}
            {expanded ? <ChevronUp size={14} className="text-[#5a5a78] ml-1" /> : <ChevronRight size={14} className="text-[#5a5a78] ml-1" />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#0d0d1a] border-b border-[#1e1e30]">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Source A */}
              <div className="bg-[#111118] border border-[#7c3aed]/30 rounded-lg p-3">
                <div className="text-xs font-semibold text-[#7c3aed] mb-2 uppercase tracking-wide">Source A — {exc.transactionA ? 'Present' : 'Missing'}</div>
                {exc.transactionA ? (
                  <dl className="space-y-1.5">
                    {[
                      ['Ref', exc.transactionA.ref],
                      ['Vendor', exc.transactionA.vendor],
                      ['Amount', formatCurrency(exc.transactionA.amount)],
                      ['Date', formatDate(exc.transactionA.date)],
                      ['Account', exc.transactionA.account],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <dt className="text-[#5a5a78]">{k}</dt>
                        <dd className="text-white font-mono-num">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="text-xs text-[#5a5a78] italic">No matching entry in Source A</div>
                )}
              </div>

              {/* Source B */}
              <div className="bg-[#111118] border border-[#059669]/30 rounded-lg p-3">
                <div className="text-xs font-semibold text-[#059669] mb-2 uppercase tracking-wide">Source B — {exc.transactionB ? 'Present' : 'Missing'}</div>
                {exc.transactionB ? (
                  <dl className="space-y-1.5">
                    {[
                      ['Ref', exc.transactionB.ref],
                      ['Vendor', exc.transactionB.vendor],
                      ['Amount', formatCurrency(exc.transactionB.amount)],
                      ['Date', formatDate(exc.transactionB.date)],
                      ['Account', exc.transactionB.account],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <dt className="text-[#5a5a78]">{k}</dt>
                        <dd className="text-white font-mono-num">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="text-xs text-[#5a5a78] italic">No matching entry in Source B</div>
                )}
              </div>
            </div>

            {/* Suggested matches */}
            {exc.suggestedMatches.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-[#9898b0] mb-2">Suggested Matches</div>
                {exc.suggestedMatches.map(sm => (
                  <div key={sm.transactionId} className="flex items-center gap-3 bg-[#111118] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs">
                    <div className={`px-1.5 py-0.5 rounded text-xs font-mono-num border ${
                      sm.confidence === 'exact' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                      sm.confidence === 'high' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                      sm.confidence === 'medium' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                      'text-red-400 bg-red-400/10 border-red-400/20'
                    }`}>
                      {sm.confidenceScore}%
                    </div>
                    <span className="text-[#9898b0]">{sm.reason}</span>
                    <span className="font-mono-num text-white ml-auto">{formatCurrency(sm.transaction.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {exc.status !== 'pending' && (
              <div className="mt-3 flex items-center gap-2 text-xs text-[#9898b0]">
                <User size={12} />
                <span>Resolved by {exc.resolvedBy} · {exc.resolvedAt ? formatDate(exc.resolvedAt) : ''}</span>
                {exc.justification && <span className="text-[#5a5a78]">· "{exc.justification}"</span>}
              </div>
            )}

            {!isResolved && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onAction(exc, 'written-off')}
                  className="px-3 py-1.5 text-xs font-medium text-[#9898b0] bg-[#1a1a2e] border border-[#2a2a3e] hover:border-[#3a3a55] rounded-lg transition-colors"
                >
                  Write-off (&lt; $10)
                </button>
                <button
                  onClick={() => onAction(exc, 'deferred')}
                  className="px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-400/10 border border-purple-400/20 hover:bg-purple-400/20 rounded-lg transition-colors"
                >
                  Defer to Next Period
                </button>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function Exceptions() {
  const [searchParams] = useSearchParams();
  const reconFilter = searchParams.get('recon');

  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('age');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ exc: Exception; action: ExceptionStatus } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    getExceptions(reconFilter ?? undefined).then(e => {
      setExceptions(e);
      setLoading(false);
    });
  }, [reconFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleAction = (exc: Exception, action: ExceptionStatus) => {
    if (action === 'approved') {
      resolveException(exc.reconciliationId, exc.id, action).then(() => {
        toast.success(`Exception ${exc.transactionA?.ref} approved`);
        load();
      });
    } else {
      setPendingAction({ exc, action });
    }
  };

  const handleConfirm = (justification?: string, escalatedTo?: string) => {
    if (!pendingAction) return;
    const { exc, action } = pendingAction;
    resolveException(exc.reconciliationId, exc.id, action, { justification, escalatedTo }).then(() => {
      const labels: Record<string, string> = {
        'force-matched': 'Force-matched',
        'written-off': 'Written off',
        escalated: 'Escalated',
        deferred: 'Deferred to next period',
      };
      toast.success(`${labels[action] ?? action} — ${exc.transactionA?.ref}`);
      setPendingAction(null);
      load();
    });
  };

  const handleBatchApprove = () => {
    const selected = exceptions.filter(e => selectedIds.has(e.id) && e.status === 'pending');
    Promise.all(selected.map(e => resolveException(e.reconciliationId, e.id, 'approved'))).then(() => {
      toast.success(`${selected.length} exceptions approved`);
      setSelectedIds(new Set());
      load();
    });
  };

  const sorted = [...exceptions]
    .filter(e => filterStatus === 'all' || e.status === filterStatus)
    .filter(e => filterType === 'all' || e.type === filterType)
    .sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortField === 'amount') { va = a.amount; vb = b.amount; }
      else if (sortField === 'age') { va = a.age; vb = b.age; }
      else if (sortField === 'type') { va = a.type; vb = b.type; }
      else { va = a.status; vb = b.status; }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const counts = {
    pending: exceptions.filter(e => e.status === 'pending').length,
    escalated: exceptions.filter(e => e.status === 'escalated').length,
    resolved: exceptions.filter(e => e.status !== 'pending' && e.status !== 'escalated').length,
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-[#5a5a78] uppercase tracking-wide cursor-pointer select-none hover:text-[#9898b0] whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <ArrowUpDown size={11} className={sortField === field ? 'text-[#7c3aed]' : ''} />
      </span>
    </th>
  );

  if (loading) {
    return <div className="p-6"><div className="h-96 skeleton rounded-xl" /></div>;
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Exception Queue</h1>
          <p className="text-sm text-[#5a5a78] mt-0.5">
            {counts.pending} pending · {counts.escalated} escalated · {counts.resolved} resolved
          </p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9898b0]">{selectedIds.size} selected</span>
            <button
              onClick={handleBatchApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <CheckCircle2 size={13} />
              Batch Approve
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs text-[#9898b0] border border-[#2a2a3e] rounded-lg hover:border-[#3a3a55]"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Aging summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { bucket: '<24h', label: 'Under 24h', color: 'emerald', count: exceptions.filter(e => e.agingBucket === '<24h').length },
          { bucket: '1-3d', label: '1–3 days', color: 'amber', count: exceptions.filter(e => e.agingBucket === '1-3d').length },
          { bucket: '4-7d', label: '4–7 days', color: 'orange', count: exceptions.filter(e => e.agingBucket === '4-7d').length },
          { bucket: '>7d', label: 'Over 7 days', color: 'red', count: exceptions.filter(e => e.agingBucket === '>7d').length },
        ].map(b => (
          <div
            key={b.bucket}
            className={`bg-[#111118] border border-[#1e1e30] rounded-xl p-4 cursor-pointer transition-colors ${
              filterStatus === b.bucket ? 'border-[#7c3aed]/50' : 'hover:border-[#2a2a3e]'
            }`}
          >
            <div className={`text-2xl font-mono-num font-semibold text-${b.color}-400`}>{b.count}</div>
            <div className="text-xs text-[#5a5a78] mt-0.5">{b.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter size={14} className="text-[#5a5a78]" />
        <div className="flex gap-1">
          {['all', 'pending', 'escalated', 'approved', 'force-matched', 'written-off', 'deferred'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                filterStatus === s
                  ? 'bg-[#7c3aed]/20 text-white border border-[#7c3aed]/40'
                  : 'text-[#9898b0] hover:text-white hover:bg-[#1a1a2e] border border-transparent'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
        <div className="ml-4 flex gap-1">
          {['all', 'missing', 'amount-diff', 'timing', 'duplicate'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                filterType === t
                  ? 'bg-[#1a1a2e] text-white border border-[#2a2a3e]'
                  : 'text-[#5a5a78] hover:text-[#9898b0] border border-transparent'
              }`}
            >
              {t === 'all' ? 'All types' : exceptionTypeLabel(t)}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-[#5a5a78]">{sorted.length} exceptions</span>
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-[#1e1e30] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e1e30]">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  className="accent-[#7c3aed]"
                  onChange={e => {
                    if (e.target.checked) setSelectedIds(new Set(sorted.filter(x => x.status === 'pending').map(x => x.id)));
                    else setSelectedIds(new Set());
                  }}
                />
              </th>
              <SortHeader field="age">Age</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#5a5a78] uppercase tracking-wide">Reference</th>
              <SortHeader field="type">Type</SortHeader>
              <SortHeader field="amount">Amount</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#5a5a78] uppercase tracking-wide">Created</th>
              <SortHeader field="status">Status</SortHeader>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#5a5a78] uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
                  <div className="text-sm text-[#9898b0]">No exceptions match the current filter</div>
                </td>
              </tr>
            ) : (
              sorted.map(exc => (
                <ExceptionRow
                  key={exc.id}
                  exc={exc}
                  onAction={handleAction}
                  expanded={expandedId === exc.id}
                  onToggle={() => setExpandedId(expandedId === exc.id ? null : exc.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {pendingAction && (
        <JustificationModal
          action={pendingAction.action}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
