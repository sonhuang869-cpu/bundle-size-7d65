import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Reconciliations } from './pages/Reconciliations';
import { Workspace } from './pages/Workspace';
import { Exceptions } from './pages/Exceptions';
import { Import } from './pages/Import';
import { Settings } from './pages/Settings';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-6xl font-mono-num font-semibold text-[#2a2a3e] mb-4">404</div>
      <div className="text-sm text-[#9898b0]">Page not found</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reconciliations" element={<Reconciliations />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="/import" element={<Import />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
