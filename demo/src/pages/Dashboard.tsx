import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, ArrowUpRight, Layers } from 'lucide-react';
import { getDashboardStats, getMonthlyTrends, getExceptionSources, getReconciliations } from '@/lib/api';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { Reconciliation } from '@/lib/types';

const PURPLE = '#7c3aed';
const GREEN = '#059669';
const RED = '#dc2626';
const AMBER = '#d97706';
const BLUE = '#2563eb';

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-[#111118] border border-[#1e1e30] rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center`} style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <ArrowUpRight size={14} className="text-[#5a5a78]" />
      </div>
      <div className="font-mono-num text-2xl font-semibold text-white mb-1">{value}</div>
      <div className="text-xs text-[#9898b0]">{label}</div>
      {sub && <div className="text-xs text-[#5a5a78] mt-0.5">{sub}</div>}
    </div>
  );
}

function SLABar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-[#9898b0]">{label}</span>
        <span className="font-mono-num text-white">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-[#9898b0] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#9898b0]">{p.name}:</span>
          <span className="text-white font-mono-num">{p.name === 'matchRate' ? `${p.value}%` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getMonthlyTrends(),
      getExceptionSources(),
      getReconciliations(),
    ]).then(([s, t, src, r]) => {
      setStats(s);
      setTrends(t);
      setSources(src);
      setReconciliations(r);
      setLoading(false);
    });
  }, []);

  const matchDistribution = reconciliations.map(r => ({
    name: r.name.split(' vs ')[0].split(' ')[0],
    matched: r.matchedItems,
    exceptions: r.exceptionCount,
  }));

  const agingData = [
    { bucket: '<24h', count: 2, fill: '#059669' },
    { bucket: '1–3d', count: 5, fill: '#d97706' },
    { bucket: '4–7d', count: 3, fill: '#ea580c' },
    { bucket: '>7d', count: 4, fill: '#dc2626' },
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 skeleton rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 skeleton rounded-xl" />
          <div className="h-64 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Reconciliation Overview</h1>
          <p className="text-sm text-[#5a5a78] mt-0.5">November 2026 · 3 active reconciliation sets</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#5a5a78] bg-[#111118] border border-[#1e1e30] px-3 py-1.5 rounded-lg">
          <Clock size={12} />
          <span>Last refreshed: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={CheckCircle2}
          label="Avg Match Rate"
          value={formatPercent(stats.avgMatchRate)}
          sub="Across all sets"
          color={GREEN}
        />
        <StatCard
          icon={AlertTriangle}
          label="Open Exceptions"
          value={String(stats.openExceptions)}
          sub="Requiring action"
          color={RED}
        />
        <StatCard
          icon={TrendingUp}
          label="Resolved Today"
          value={String(stats.resolvedToday)}
          sub="Exceptions closed"
          color={PURPLE}
        />
        <StatCard
          icon={Layers}
          label="Reconciliations"
          value={String(stats.totalReconciliations)}
          sub="Active sets"
          color={BLUE}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Match Rate Trend */}
        <div className="lg:col-span-2 bg-[#111118] border border-[#1e1e30] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-sm font-semibold text-white">Match Rate Trend</div>
              <div className="text-xs text-[#5a5a78] mt-0.5">6-month rolling — % of items matched</div>
            </div>
            <div className="text-xs font-mono-num text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
              +{(trends[trends.length - 1]?.matchRate - trends[0]?.matchRate).toFixed(1)}pp
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trends} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="matchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e30" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#5a5a78', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v.split(' ')[0]} />
              <YAxis tick={{ fill: '#5a5a78', fontSize: 10 }} axisLine={false} tickLine={false}
                domain={[85, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="matchRate" name="matchRate" stroke={GREEN}
                strokeWidth={2} fill="url(#matchGrad)" dot={{ fill: GREEN, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* SLA Tracker */}
        <div className="bg-[#111118] border border-[#1e1e30] rounded-xl p-5">
          <div className="text-sm font-semibold text-white mb-1">SLA Compliance</div>
          <div className="text-xs text-[#5a5a78] mb-5">Exceptions resolved within target</div>
          <div className="space-y-5">
            <SLABar label="Within 24 hours" pct={stats.sla24h} color={GREEN} />
            <SLABar label="Within 48 hours" pct={stats.sla48h} color={AMBER} />
            <SLABar label="Within 72 hours" pct={stats.sla72h} color={PURPLE} />
          </div>
          <div className="mt-6 pt-4 border-t border-[#1e1e30]">
            <div className="text-xs text-[#5a5a78] mb-2">Aging Distribution</div>
            <div className="grid grid-cols-2 gap-2">
              {agingData.map(d => (
                <div key={d.bucket} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                  <span className="text-xs text-[#9898b0]">{d.bucket}</span>
                  <span className="text-xs font-mono-num text-white ml-auto">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Match vs Exception by dataset */}
        <div className="bg-[#111118] border border-[#1e1e30] rounded-xl p-5">
          <div className="text-sm font-semibold text-white mb-1">Items by Reconciliation Set</div>
          <div className="text-xs text-[#5a5a78] mb-5">Matched vs open exceptions per dataset</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={matchDistribution} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e30" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#5a5a78', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5a5a78', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span style={{ color: '#9898b0', fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="matched" name="Matched" fill={GREEN} radius={[3, 3, 0, 0]} maxBarSize={40} />
              <Bar dataKey="exceptions" name="Exceptions" fill={RED} radius={[3, 3, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Exception Sources */}
        <div className="bg-[#111118] border border-[#1e1e30] rounded-xl p-5">
          <div className="text-sm font-semibold text-white mb-1">Top Exception Sources</div>
          <div className="text-xs text-[#5a5a78] mb-4">Recurring mismatch categories</div>
          <div className="space-y-2.5">
            {sources.map((src, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 text-center">
                  <span className="text-xs font-mono-num text-[#5a5a78]">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#f0f0f8] truncate">{src.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="h-1 bg-[#1a1a2e] rounded-full flex-1">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(src.count / sources[0].count) * 100}%`,
                          background: i === 0 ? RED : i === 1 ? AMBER : PURPLE,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono-num text-[#9898b0] flex-shrink-0">{src.count} items</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono-num text-white">{formatCurrency(src.totalAmount).replace('$', '$')}</div>
                  <div className="text-xs text-[#5a5a78]">{src.avgAge.toFixed(1)}d avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reconciliation Status Table */}
      <div className="bg-[#111118] border border-[#1e1e30] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e30] flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Active Reconciliation Sets</div>
          <span className="text-xs text-[#5a5a78]">{reconciliations.length} sets</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e1e30]">
              {['Reconciliation', 'Period', 'Items', 'Match Rate', 'Exceptions', 'Status'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-[#5a5a78] px-5 py-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reconciliations.map(r => (
              <tr key={r.id} className="border-b border-[#1e1e30]/50 hover:bg-[#1a1a2e]/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="text-sm text-white font-medium">{r.name}</div>
                  <div className="text-xs text-[#5a5a78] mt-0.5">{r.sourceA} · {r.sourceB}</div>
                </td>
                <td className="px-5 py-3.5 text-sm text-[#9898b0]">{r.period}</td>
                <td className="px-5 py-3.5 text-sm font-mono-num text-[#9898b0]">{r.totalItems}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden max-w-16">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${r.matchRate}%`,
                          background: r.matchRate >= 95 ? GREEN : r.matchRate >= 90 ? AMBER : RED,
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono-num text-white">{formatPercent(r.matchRate)}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`font-mono-num text-sm ${r.exceptionCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {r.exceptionCount}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                    r.status === 'closed'
                      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                      : r.status === 'in-review'
                      ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                      : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                  }`}>
                    {r.status === 'closed' ? 'Closed' : r.status === 'in-review' ? 'In Review' : 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
