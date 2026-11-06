import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type ParsedRow = {
  ref: string; description: string; amount: number; date: string; account: string; vendor: string;
};

type MatchResult = {
  ref: string; amountA: number; amountB: number; dateA: string; dateB: string;
  confidence: 'exact' | 'high' | 'medium' | 'low'; score: number; method: string;
};

const SAMPLE_A = `Reference,Description,Amount,Date,Account,Vendor
INV-2026-0010,Meridian Capital Partners — Q4 retainer,24500.00,2026-10-05,GL-4001,Meridian Capital Partners
INV-2026-0011,Westfield Group Holdings — advisory fee,8750.50,2026-10-06,GL-4002,Westfield Group Holdings
INV-2026-0012,Apex Financial Services — consulting,15200.00,2026-10-08,GL-4003,Apex Financial Services
INV-2026-0013,Northgate Securities — settlement,42100.00,2026-10-09,GL-4004,Northgate Securities Ltd
INV-2026-0014,Clearwater Asset Mgmt — mgmt fee,6300.25,2026-10-10,GL-4005,Clearwater Asset Management
INV-2026-0015,Sterling Bridge Corp — bond proceeds,78500.00,2026-10-12,GL-4006,Sterling Bridge Corp`;

const SAMPLE_B = `Reference,Description,Amount,Date,Account,Vendor
INV-2026-0010,Bank credit — INV-2026-0010,24500.00,2026-10-05,BANK-CHK-001,Meridian Capital Partners
INV-2026-0011,Bank credit — INV-2026-0011,8751.00,2026-10-07,BANK-CHK-001,Westfield Group Holdings
INV-2026-0012,Bank credit — INV-2026-0012,15200.00,2026-10-08,BANK-CHK-001,Apex Financial Services
INV-2026-0013,Bank credit — INV-2026-0013,42100.00,2026-10-09,BANK-CHK-001,Northgate Securities Ltd
INV-2026-0016,Bank credit — INV-2026-0016,9800.00,2026-10-11,BANK-CHK-001,Ironwood Investments`;

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').slice(1);
  return lines.map(line => {
    const [ref, description, amount, date, account, vendor] = line.split(',').map(s => s.trim());
    return { ref, description, amount: parseFloat(amount), date, account, vendor };
  }).filter(r => r.ref && !isNaN(r.amount));
}

function runMatching(rowsA: ParsedRow[], rowsB: ParsedRow[]): {
  matched: MatchResult[];
  unmatchedA: ParsedRow[];
  unmatchedB: ParsedRow[];
} {
  const matched: MatchResult[] = [];
  const usedB = new Set<string>();
  const unmatchedA: ParsedRow[] = [];

  rowsA.forEach(a => {
    // Exact reference match
    const exactB = rowsB.find(b => b.ref === a.ref && !usedB.has(b.ref));
    if (exactB) {
      const amtDiff = Math.abs(a.amount - exactB.amount);
      const dateDiff = Math.abs(new Date(a.date).getTime() - new Date(exactB.date).getTime()) / 86400000;
      let confidence: MatchResult['confidence'] = 'exact';
      let score = 100;
      if (amtDiff > 0.01 || dateDiff > 0) {
        confidence = amtDiff < 0.01 && dateDiff <= 1 ? 'high' : amtDiff < 1 ? 'medium' : 'low';
        score = amtDiff < 0.01 && dateDiff <= 1 ? 96 : amtDiff < 1 ? 85 : 72;
      }
      matched.push({
        ref: a.ref, amountA: a.amount, amountB: exactB.amount,
        dateA: a.date, dateB: exactB.date,
        confidence, score,
        method: amtDiff === 0 && dateDiff === 0 ? 'Exact reference' : 'Reference + fuzzy amount/date',
      });
      usedB.add(exactB.ref);
      return;
    }
    // Amount + date fuzzy match
    const fuzzyB = rowsB.find(b => {
      if (usedB.has(b.ref)) return false;
      const amtDiff = Math.abs(a.amount - b.amount);
      const dateDiff = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) / 86400000;
      return amtDiff <= 0.01 && dateDiff <= 1;
    });
    if (fuzzyB) {
      matched.push({
        ref: a.ref, amountA: a.amount, amountB: fuzzyB.amount,
        dateA: a.date, dateB: fuzzyB.date,
        confidence: 'medium', score: 83,
        method: 'Amount + date (±$0.01, ±1 day)',
      });
      usedB.add(fuzzyB.ref);
      return;
    }
    unmatchedA.push(a);
  });

  const unmatchedB = rowsB.filter(b => !usedB.has(b.ref));
  return { matched, unmatchedA, unmatchedB };
}

function DropZone({ label, source, file, rows, onLoad, color }: {
  label: string; source: 'A' | 'B'; file: string | null; rows: ParsedRow[];
  onLoad: (text: string, name: string) => void; color: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) {
      f.text().then(t => onLoad(t, f.name));
    } else {
      toast.error('Please upload a CSV file');
    }
  }, [onLoad]);

  const handleSample = () => {
    onLoad(source === 'A' ? SAMPLE_A : SAMPLE_B, `sample_source_${source.toLowerCase()}.csv`);
  };

  return (
    <div className="bg-[#111118] border border-[#1e1e30] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1e30] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        {file && <span className="text-xs text-[#5a5a78]">{file} · {rows.length} rows</span>}
      </div>

      {!file ? (
        <div
          className="p-8 flex flex-col items-center justify-center border-2 border-dashed border-[#2a2a3e] hover:border-[#3a3a55] m-4 rounded-lg cursor-pointer transition-colors"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) f.text().then(t => onLoad(t, f.name));
            }}
          />
          <Upload size={24} className="text-[#5a5a78] mb-3" />
          <div className="text-sm text-[#9898b0] mb-1">Drop CSV file or click to browse</div>
          <div className="text-xs text-[#5a5a78]">Columns: Reference, Description, Amount, Date, Account, Vendor</div>
          <button
            onClick={e => { e.stopPropagation(); handleSample(); }}
            className="mt-4 px-3 py-1.5 text-xs text-[#7c3aed] bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20 border border-[#7c3aed]/30 rounded-lg transition-colors"
          >
            Load sample data
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e1e30] bg-[#0d0d1a]">
                {['Reference', 'Description', 'Amount', 'Date', 'Account'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[#5a5a78] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((r, i) => (
                <tr key={i} className="border-b border-[#1e1e30]/30 hover:bg-[#1a1a2e]/30">
                  <td className="px-3 py-2 font-mono-num text-white">{r.ref}</td>
                  <td className="px-3 py-2 text-[#9898b0] max-w-40 truncate">{r.description}</td>
                  <td className="px-3 py-2 font-mono-num text-white">{formatCurrency(r.amount)}</td>
                  <td className="px-3 py-2 font-mono-num text-[#9898b0]">{r.date}</td>
                  <td className="px-3 py-2 text-[#9898b0]">{r.account}</td>
                </tr>
              ))}
              {rows.length > 8 && (
                <tr><td colSpan={5} className="px-3 py-2 text-xs text-[#5a5a78] italic">+{rows.length - 8} more rows…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Import() {
  const [fileA, setFileA] = useState<string | null>(null);
  const [fileB, setFileB] = useState<string | null>(null);
  const [rowsA, setRowsA] = useState<ParsedRow[]>([]);
  const [rowsB, setRowsB] = useState<ParsedRow[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ReturnType<typeof runMatching> | null>(null);
  const [matchRule, setMatchRule] = useState<'reference' | 'amount-date' | 'combined'>('combined');

  const handleLoadA = (text: string, name: string) => {
    setRowsA(parseCSV(text));
    setFileA(name);
    setResults(null);
  };
  const handleLoadB = (text: string, name: string) => {
    setRowsB(parseCSV(text));
    setFileB(name);
    setResults(null);
  };

  const handleRunMatching = async () => {
    if (!rowsA.length || !rowsB.length) {
      toast.error('Please load both source files');
      return;
    }
    setRunning(true);
    setProgress(0);
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 60));
      setProgress(i);
    }
    const r = runMatching(rowsA, rowsB);
    setResults(r);
    setRunning(false);
    setProgress(100);
    toast.success(`Matching complete — ${r.matched.length} pairs found`);
  };

  const confidenceCounts = results ? {
    exact: results.matched.filter(m => m.confidence === 'exact').length,
    high: results.matched.filter(m => m.confidence === 'high').length,
    medium: results.matched.filter(m => m.confidence === 'medium').length,
    low: results.matched.filter(m => m.confidence === 'low').length,
  } : null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Data Import & Matching Engine</h1>
          <p className="text-sm text-[#5a5a78] mt-0.5">Upload source files and run automated reconciliation matching</p>
        </div>
      </div>

      {/* Matching rule selector */}
      <div className="bg-[#111118] border border-[#1e1e30] rounded-xl p-4 mb-5">
        <div className="text-xs font-semibold text-[#9898b0] uppercase tracking-wide mb-3">Matching Rules Configuration</div>
        <div className="flex gap-3">
          {[
            { value: 'reference', label: 'Reference Number', sub: 'Exact ref match only' },
            { value: 'amount-date', label: 'Amount + Date', sub: 'Fuzzy ±$0.01, ±1 day' },
            { value: 'combined', label: 'Combined (Recommended)', sub: 'Reference first, then amount+date' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setMatchRule(opt.value as typeof matchRule)}
              className={`flex-1 px-3 py-2.5 text-left rounded-lg border transition-colors ${
                matchRule === opt.value
                  ? 'border-[#7c3aed] bg-[#7c3aed]/10'
                  : 'border-[#2a2a3e] hover:border-[#3a3a55]'
              }`}
            >
              <div className="text-xs font-medium text-white">{opt.label}</div>
              <div className="text-xs text-[#5a5a78] mt-0.5">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Drop zones */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <DropZone
          label="Source A — ERP / General Ledger"
          source="A"
          file={fileA}
          rows={rowsA}
          onLoad={handleLoadA}
          color="#7c3aed"
        />
        <DropZone
          label="Source B — Bank Statement / Subledger"
          source="B"
          file={fileB}
          rows={rowsB}
          onLoad={handleLoadB}
          color="#059669"
        />
      </div>

      {/* Run button */}
      <div className="flex items-center justify-center mb-5">
        <button
          onClick={handleRunMatching}
          disabled={running || !rowsA.length || !rowsB.length}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={15} />
          {running ? 'Running matching engine…' : 'Run Automated Matching'}
        </button>
      </div>

      {/* Progress */}
      {running && (
        <div className="bg-[#111118] border border-[#1e1e30] rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2 text-xs text-[#9898b0]">
            <span>Matching engine running…</span>
            <span className="font-mono-num">{progress}%</span>
          </div>
          <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7c3aed] rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-[#5a5a78] mt-2">
            {progress < 30 ? 'Parsing source files…' : progress < 60 ? 'Running reference matching…' : 'Running fuzzy amount/date matching…'}
          </div>
        </div>
      )}

      {/* Results */}
      {results && !running && (
        <div className="fade-in space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#111118] border border-[#059669]/30 rounded-xl p-4">
              <div className="text-2xl font-mono-num font-semibold text-emerald-400">{results.matched.length}</div>
              <div className="text-xs text-[#5a5a78] mt-0.5">Matched pairs</div>
            </div>
            <div className="bg-[#111118] border border-[#dc2626]/30 rounded-xl p-4">
              <div className="text-2xl font-mono-num font-semibold text-red-400">{results.unmatchedA.length}</div>
              <div className="text-xs text-[#5a5a78] mt-0.5">Unmatched in Source A</div>
            </div>
            <div className="bg-[#111118] border border-[#dc2626]/30 rounded-xl p-4">
              <div className="text-2xl font-mono-num font-semibold text-red-400">{results.unmatchedB.length}</div>
              <div className="text-xs text-[#5a5a78] mt-0.5">Unmatched in Source B</div>
            </div>
            <div className="bg-[#111118] border border-[#1e1e30] rounded-xl p-4">
              <div className="text-2xl font-mono-num font-semibold text-white">
                {((results.matched.length / (rowsA.length || 1)) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-[#5a5a78] mt-0.5">Match rate</div>
            </div>
          </div>

          {/* Confidence distribution */}
          {confidenceCounts && (
            <div className="bg-[#111118] border border-[#1e1e30] rounded-xl p-4">
              <div className="text-xs font-semibold text-[#9898b0] uppercase tracking-wide mb-3">Confidence Distribution</div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { key: 'exact', label: 'Exact (100%)', color: 'emerald', count: confidenceCounts.exact },
                  { key: 'high', label: 'High (95%+)', color: 'green', count: confidenceCounts.high },
                  { key: 'medium', label: 'Medium (80–94%)', color: 'amber', count: confidenceCounts.medium },
                  { key: 'low', label: 'Low (<80%)', color: 'red', count: confidenceCounts.low },
                ].map(c => (
                  <div key={c.key} className="flex items-center gap-2">
                    <div className={`text-lg font-mono-num font-semibold text-${c.color}-400`}>{c.count}</div>
                    <div className="text-xs text-[#5a5a78]">{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched pairs table */}
          <div className="bg-[#111118] border border-[#1e1e30] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e1e30] flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white">Matched Pairs ({results.matched.length})</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e1e30] bg-[#0d0d1a]">
                  {['Reference', 'Amount A', 'Amount B', 'Δ Amount', 'Date A', 'Date B', 'Method', 'Confidence'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[#5a5a78] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.matched.map((m, i) => (
                  <tr key={i} className="border-b border-[#1e1e30]/30 hover:bg-[#059669]/5">
                    <td className="px-3 py-2 font-mono-num text-white">{m.ref}</td>
                    <td className="px-3 py-2 font-mono-num text-[#9898b0]">{formatCurrency(m.amountA)}</td>
                    <td className="px-3 py-2 font-mono-num text-[#9898b0]">{formatCurrency(m.amountB)}</td>
                    <td className="px-3 py-2 font-mono-num">
                      <span className={Math.abs(m.amountA - m.amountB) > 0.005 ? 'text-amber-400' : 'text-emerald-400'}>
                        {formatCurrency(Math.abs(m.amountA - m.amountB))}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono-num text-[#9898b0]">{m.dateA}</td>
                    <td className="px-3 py-2 font-mono-num text-[#9898b0]">{m.dateB}</td>
                    <td className="px-3 py-2 text-[#9898b0] max-w-32 truncate">{m.method}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded border font-mono-num text-xs ${
                        m.confidence === 'exact' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                        m.confidence === 'high' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                        m.confidence === 'medium' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                        'text-red-400 bg-red-400/10 border-red-400/20'
                      }`}>
                        {m.score}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Unmatched */}
          {(results.unmatchedA.length > 0 || results.unmatchedB.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Unmatched — Source A', rows: results.unmatchedA, color: '#7c3aed' },
                { label: 'Unmatched — Source B', rows: results.unmatchedB, color: '#059669' },
              ].map(panel => (
                <div key={panel.label} className="bg-[#111118] border border-[#1e1e30] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#1e1e30] flex items-center gap-2">
                    <AlertTriangle size={13} className="text-red-400" />
                    <span className="text-sm font-semibold text-white">{panel.label} ({panel.rows.length})</span>
                  </div>
                  {panel.rows.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-emerald-400">All items matched</div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#1e1e30] bg-[#0d0d1a]">
                          {['Reference', 'Amount', 'Date', 'Vendor'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[#5a5a78] font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {panel.rows.map((r, i) => (
                          <tr key={i} className="border-b border-[#1e1e30]/30 hover:bg-[#dc2626]/5">
                            <td className="px-3 py-2 font-mono-num text-white">{r.ref}</td>
                            <td className="px-3 py-2 font-mono-num text-red-400">{formatCurrency(r.amount)}</td>
                            <td className="px-3 py-2 font-mono-num text-[#9898b0]">{r.date}</td>
                            <td className="px-3 py-2 text-[#9898b0] truncate max-w-32">{r.vendor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
