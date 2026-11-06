import { useState } from 'react';
import { toast } from 'sonner';
import { resetData } from '@/lib/api';
import { RotateCcw, Bell, Shield, Database, ChevronRight } from 'lucide-react';

export function Settings() {
  const [resetting, setResetting] = useState(false);
  const [sla24, setSla24] = useState('90');
  const [sla48, setSla48] = useState('95');
  const [sla72, setSla72] = useState('99');
  const [writeoffThreshold, setWriteoffThreshold] = useState('10');

  const handleReset = async () => {
    setResetting(true);
    await new Promise(r => setTimeout(r, 600));
    resetData();
    setResetting(false);
    toast.success('Demo data reset to initial seed state');
  };

  return (
    <div className="p-6 max-w-[800px] mx-auto fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-[#5a5a78] mt-0.5">Platform configuration and preferences</p>
      </div>

      <div className="space-y-4">
        {/* SLA Targets */}
        <div className="bg-[#111118] border border-[#1e1e30] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e30] flex items-center gap-2">
            <Bell size={15} className="text-[#7c3aed]" />
            <span className="text-sm font-semibold text-white">SLA Targets</span>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: '24-hour resolution target', value: sla24, setter: setSla24 },
              { label: '48-hour resolution target', value: sla48, setter: setSla48 },
              { label: '72-hour resolution target', value: sla72, setter: setSla72 },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-[#9898b0]">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0" max="100"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="w-16 bg-[#1a1a2e] border border-[#2a2a3e] rounded px-2 py-1 text-sm font-mono-num text-white outline-none focus:border-[#7c3aed] text-right"
                  />
                  <span className="text-sm text-[#5a5a78]">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#111118] border border-[#1e1e30] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e30] flex items-center gap-2">
            <Shield size={15} className="text-[#7c3aed]" />
            <span className="text-sm font-semibold text-white">Financial Controls</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#9898b0]">Write-off threshold</div>
                <div className="text-xs text-[#5a5a78] mt-0.5">Exceptions below this amount can be written off without escalation</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#5a5a78]">$</span>
                <input
                  type="number"
                  min="0"
                  value={writeoffThreshold}
                  onChange={e => setWriteoffThreshold(e.target.value)}
                  className="w-20 bg-[#1a1a2e] border border-[#2a2a3e] rounded px-2 py-1 text-sm font-mono-num text-white outline-none focus:border-[#7c3aed] text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#9898b0]">Force-match requires justification</div>
                <div className="text-xs text-[#5a5a78] mt-0.5">Mandatory audit trail for all forced matches</div>
              </div>
              <div className="w-9 h-5 bg-[#7c3aed] rounded-full relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#9898b0]">Auto-escalate exceptions over 7 days</div>
                <div className="text-xs text-[#5a5a78] mt-0.5">Automatically escalate aged exceptions to manager</div>
              </div>
              <div className="w-9 h-5 bg-[#7c3aed] rounded-full relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="bg-[#111118] border border-[#1e1e30] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e30] flex items-center gap-2">
            <Shield size={15} className="text-[#7c3aed]" />
            <span className="text-sm font-semibold text-white">User Roles</span>
          </div>
          <div className="divide-y divide-[#1e1e30]">
            {[
              { name: 'Henry Muchori', role: 'Sr. Financial Operations', access: 'Full Admin', initials: 'HM' },
              { name: 'Sarah Okonkwo', role: 'Manager, Financial Controls', access: 'Manager', initials: 'SO' },
              { name: 'James Mwangi', role: 'Financial Controller', access: 'Controller', initials: 'JM' },
              { name: 'Amara Diallo', role: 'Reconciliation Analyst', access: 'Analyst', initials: 'AD' },
            ].map(u => (
              <div key={u.name} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#1a1a2e]/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#059669] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {u.initials}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">{u.name}</div>
                  <div className="text-xs text-[#5a5a78]">{u.role}</div>
                </div>
                <span className="text-xs text-[#9898b0] bg-[#1a1a2e] border border-[#2a2a3e] px-2 py-0.5 rounded">{u.access}</span>
                <ChevronRight size={14} className="text-[#5a5a78]" />
              </div>
            ))}
          </div>
        </div>

        {/* Demo Reset */}
        <div className="bg-[#111118] border border-[#1e1e30] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e30] flex items-center gap-2">
            <Database size={15} className="text-[#7c3aed]" />
            <span className="text-sm font-semibold text-white">Demo Data</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm text-[#9898b0]">Reset to initial seed state</div>
              <div className="text-xs text-[#5a5a78] mt-0.5">Reverts all exception resolutions and workspace changes to the demo defaults</div>
            </div>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1a1a2e] border border-[#2a2a3e] hover:border-[#3a3a55] rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw size={14} className={resetting ? 'animate-spin' : ''} />
              {resetting ? 'Resetting…' : 'Reset Demo'}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => toast.success('Settings saved')}
            className="px-5 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
