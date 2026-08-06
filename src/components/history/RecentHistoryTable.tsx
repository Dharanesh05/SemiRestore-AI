import React, { useState } from 'react';
import { WaferSample } from '../../types/semicon';
import { backendApi } from '../../services/mockBackendApi';
import { Search, Filter, Cpu, Trash2, Eye, Download, CheckCircle2, FileSpreadsheet, FileCode } from 'lucide-react';

interface RecentHistoryTableProps {
  onSelectSample: (sample: WaferSample) => void;
}

export const RecentHistoryTable: React.FC<RecentHistoryTableProps> = ({ onSelectSample }) => {
  const [samples, setSamples] = useState<WaferSample[]>(backendApi.getSamples());
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleDelete = (id: string) => {
    backendApi.deleteSample(id);
    setSamples(backendApi.getSamples());
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const filtered = samples.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.waferLot.toLowerCase().includes(search.toLowerCase()) ||
      s.foundry.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    backendApi.deleteBatchSamples(Array.from(selectedIds));
    setSamples(backendApi.getSamples());
    setSelectedIds(new Set());
  };

  const handleExportCSV = () => {
    const selectedSamples = samples.filter((s) => selectedIds.has(s.id));
    const target = selectedSamples.length > 0 ? selectedSamples : filtered;
    const csvContent = backendApi.exportBatchCSV(target);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `semirestore-batch-metrology-${Date.now()}.csv`;
    link.click();
  };

  const handleExportJSON = () => {
    const selectedSamples = samples.filter((s) => selectedIds.has(s.id));
    const target = selectedSamples.length > 0 ? selectedSamples : filtered;
    const blob = new Blob([JSON.stringify(target, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `semirestore-batch-metrology-${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="glass-panel rounded-3xl p-6 border border-slate-200 bg-white space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-poppins text-lg font-bold text-slate-900">
            Wafer Cassette Inspection Logs & History
          </h2>
          <p className="text-xs text-slate-500">
            Archived Metrology analysis records and Restormer AI restoration outputs.
          </p>
        </div>

        {/* Right Search & Batch Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Batch Action Toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <span className="text-blue-700 font-bold">{selectedIds.size} Selected</span>
              <button
                onClick={handleBatchDelete}
                className="p-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 transition"
                title="Delete Selected"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            title="Export CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            title="Export JSON"
          >
            <FileCode className="h-3.5 w-3.5 text-blue-600" />
            <span>Export JSON</span>
          </button>

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by lot, foundry, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-1.5 pl-9 pr-3 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-y border-slate-200">
            <tr>
              <th className="py-3 px-4 w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="py-3 px-4">Wafer Sample</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Lot & Foundry</th>
              <th className="py-3 px-4">PSNR Gain</th>
              <th className="py-3 px-4">Defects</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => {
              const isChecked = selectedIds.has(s.id);
              return (
                <tr key={s.id} className={`transition ${isChecked ? 'bg-blue-50/70' : 'hover:bg-blue-50/40'}`}>
                  <td className="py-3.5 px-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(s.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{s.title}</td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      {s.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">{s.waferLot} • {s.foundry}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{s.metrics.psnr} dB</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{s.defects.length}</td>
                  <td className="py-3.5 px-4 text-slate-400">{s.timestamp}</td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => onSelectSample(s)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                      title="Open Workspace"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                      title="Delete Record"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
