import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitMerge, ArrowRight, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { getReconciliations } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Reconciliation } from '@/lib/types';

function MatchGauge({ rate }: { rate: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = (rate / 100) * circ;
  const color = rate >= 98 ? '#059669' : rate >= 90 ? '#d97706' : '#dc2626';
  return (
    <svg viewBox="0 0 88 88" className="w-20 h-20">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#1a1a2e" strokeWidth="8" />
      <circle
        cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="44" y="40" textAnchor="middle" fill="#f0f0f8" fontSize="13" fontWeight="600" fontFamily="JetBrains Mono, monospace">
        {rate.toFixed(0)}%
      </text>
      <text x="44" y="54" textAnchor="middle" fill="#5a5a78" fontSize="8">matched</text>
    </svg>
  );
}

export function Reconciliations() {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReconciliations().then(r => {
      setReconciliations(r);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-48 skeleton rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Reconciliation Sets</h1>
          <p className="text-sm text-[#5a5a78] mt-0.5">{reconciliations.length} datasets · November 2026</p>
        </div>
      </div>

      <div className="space-y-4">
        {reconciliations.map(r => (
          <div key={r.id} className="bg-[#111118] border border-[#1e1e30] rounded-xl p-5 hover:border-[#2a2a3e] transition-colors">
            <div className="flex items-start gap-5">
              {/* Gauge */}
              <div className="flex-shrink-0">
                <MatchGauge rate={r.matchRate} />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-white">{r.name}</h2>
                      {r.status === 'closed' && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded">
                          <Lock size={10} /> Closed
                        </span>
                      )}
                      {r.status === 'in-review' && (
                        <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                          In Review
                        </span>
                      )}
                      {r.status === 'active' && (
                        <span className="text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-[#9898b0]">
                      <span className="text-[#7c3aed]">{r.sourceA}</span>
                      <ArrowRight size={11} />
                      <span className="text-[#059669]">{r.sourceB}</span>
                    </div>
                    <div className="text-xs text-[#5a5a78] mt-0.5">Period: {r.period}</div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-[#5a5a78] mb-1">Total Items</div>
                    <div className="text-lg font-mono-num font-semibold text-white">{r.totalItems}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#5a5a78] mb-1">Matched</div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <div className="text-lg font-mono-num font-semibold text-emerald-400">{r.matchedItems}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#5a5a78] mb-1">Exceptions</div>
                    <div className="flex items-center gap-1.5">
                      {r.exceptionCount > 0
                        ? <AlertTriangle size={14} className="text-red-400" />
                        : <CheckCircle2 size={14} className="text-emerald-400" />}
                      <div className={`text-lg font-mono-num font-semibold ${r.exceptionCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {r.exceptionCount}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#5a5a78] mb-1">Created</div>
                    <div className="text-sm font-mono-num text-[#9898b0]">{formatDate(r.createdAt)}</div>
                    {r.closedAt && (
                      <div className="text-xs text-[#5a5a78] mt-0.5">Closed {formatDate(r.closedAt)}</div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${r.matchRate}%`,
                        background: r.matchRate >= 98 ? '#059669' : r.matchRate >= 90 ? '#d97706' : '#dc2626',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Link
                  to={`/workspace?id=${r.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <GitMerge size={13} />
                  Open Workspace
                </Link>
                {r.exceptionCount > 0 && (
                  <Link
                    to={`/exceptions?recon=${r.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#dc2626]/10 hover:bg-[#dc2626]/20 text-red-400 border border-red-400/20 text-xs font-medium rounded-lg transition-colors"
                  >
                    <AlertTriangle size={13} />
                    {r.exceptionCount} Exception{r.exceptionCount !== 1 ? 's' : ''}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
