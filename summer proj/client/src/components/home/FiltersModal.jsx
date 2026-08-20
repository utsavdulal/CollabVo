import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, ChevronRight, Banknote, Gift, MapPin, Globe, SlidersHorizontal } from 'lucide-react';

export function FiltersModal({ open, onClose, filters, onApply }) {
  const [eventType, setEventType] = useState(filters?.eventType || 'Paid');
  const [budget, setBudget] = useState(filters?.budget || 'Any budget');
  const [deadline, setDeadline] = useState(filters?.deadline || 'Any time');
  const [locationType, setLocationType] = useState(filters?.locationType || 'Onsite');
  const [city, setCity] = useState(filters?.city || '');
  const [customBudget, setCustomBudget] = useState(filters?.customBudget || '');

  if (!open) return null;

  const resetAll = () => {
    setEventType('Paid');
    setBudget('Any budget');
    setDeadline('Any time');
    setLocationType('Onsite');
    setCity('');
    setCustomBudget('');
  };

  const handleApply = () => {
    onApply({
      eventType,
      budget,
      deadline,
      locationType,
      city,
      customBudget
    });
    onClose();
  };

  const budgetRow1 = ['Any budget', 'Under Rs 10k'];
  const budgetRow2 = ['Rs 10k–30k', 'Rs 30k+', 'Custom'];

  const deadlineRow1 = ['Any time', 'This week', 'This month'];
  const deadlineRow2 = ['Next 3 months', 'Custom'];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Dark Blur Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Drawer / Sheet Content */}
      <div className="relative z-10 w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] border border-[#262a3e] bg-[#121522] p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Pull Down Handle / Pill */}
        <div className="flex justify-center -mt-2 mb-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-12 items-center justify-center rounded-full bg-[#202438] text-zinc-400 hover:text-white transition-colors"
            aria-label="Close filters"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262a3e]">
          <h2 className="text-2xl font-black text-white tracking-tight">Filters</h2>
          <button
            type="button"
            onClick={resetAll}
            className="text-sm font-bold text-[#818cf8] hover:text-[#a5b4fc] transition-colors"
          >
            Reset all
          </button>
        </div>

        <div className="space-y-6 pt-5">
          {/* 1. EVENT TYPE */}
          <div>
            <label className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8e95af]">
              <span>🏷️ EVENT TYPE</span>
            </label>
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setEventType('Paid')}
                className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-bold transition-all ${
                  eventType === 'Paid'
                    ? 'border-[#6366f1] bg-[#232542] text-white shadow-sm'
                    : 'border-[#262a3e] bg-[#161926] text-[#8e95af] hover:border-[#3a4060] hover:text-white'
                }`}
              >
                <Banknote className="h-4 w-4" /> Paid
              </button>
              <button
                type="button"
                onClick={() => setEventType('Free')}
                className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-bold transition-all ${
                  eventType === 'Free'
                    ? 'border-[#6366f1] bg-[#232542] text-white shadow-sm'
                    : 'border-[#262a3e] bg-[#161926] text-[#8e95af] hover:border-[#3a4060] hover:text-white'
                }`}
              >
                <Gift className="h-4 w-4" /> Free
              </button>
            </div>
          </div>

          {/* 2. BUDGET */}
          <div>
            <label className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8e95af]">
              <span>💵 BUDGET</span>
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {budgetRow1.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setBudget(opt)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                      budget === opt
                        ? 'border-[#6366f1] bg-[#232542] text-white'
                        : 'border-[#262a3e] bg-[#161926] text-[#8e95af] hover:border-[#3a4060] hover:text-white'
                    }`}
                  >
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {budgetRow2.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setBudget(opt)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                      budget === opt
                        ? 'border-[#6366f1] bg-[#232542] text-white'
                        : 'border-[#262a3e] bg-[#161926] text-[#8e95af] hover:border-[#3a4060] hover:text-white'
                    }`}
                  >
                    {opt === 'Custom' && <SlidersHorizontal className="h-3.5 w-3.5" />}
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            </div>
            {budget === 'Custom' && (
              <input
                type="number"
                value={customBudget}
                onChange={(e) => setCustomBudget(e.target.value)}
                placeholder="Enter minimum amount (e.g. 5000)"
                className="input mt-3 text-xs border-[#262a3e] bg-[#161926] text-white placeholder:text-[#8e95af]"
              />
            )}
          </div>

          {/* 3. DEADLINE */}
          <div>
            <label className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8e95af]">
              <span>📅 DEADLINE</span>
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {deadlineRow1.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDeadline(opt)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                      deadline === opt
                        ? 'border-[#6366f1] bg-[#232542] text-white'
                        : 'border-[#262a3e] bg-[#161926] text-[#8e95af] hover:border-[#3a4060] hover:text-white'
                    }`}
                  >
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {deadlineRow2.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDeadline(opt)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                      deadline === opt
                        ? 'border-[#6366f1] bg-[#232542] text-white'
                        : 'border-[#262a3e] bg-[#161926] text-[#8e95af] hover:border-[#3a4060] hover:text-white'
                    }`}
                  >
                    {opt === 'Custom' && <SlidersHorizontal className="h-3.5 w-3.5" />}
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. LOCATION TYPE */}
          <div>
            <label className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8e95af]">
              <span>🌐 LOCATION TYPE</span>
            </label>
            <div className="flex rounded-2xl border border-[#262a3e] bg-[#161926] p-1">
              <button
                type="button"
                onClick={() => setLocationType('Onsite')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  locationType === 'Onsite'
                    ? 'bg-[#6366f1] text-white shadow-md'
                    : 'text-[#8e95af] hover:text-white'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" /> Onsite
              </button>
              <button
                type="button"
                onClick={() => setLocationType('Remote')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  locationType === 'Remote'
                    ? 'bg-[#6366f1] text-white shadow-md'
                    : 'text-[#8e95af] hover:text-white'
                }`}
              >
                <Globe className="h-3.5 w-3.5" /> Remote
              </button>
            </div>
          </div>

          {/* 5. Search City */}
          <div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e95af]" />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search city..."
                className="w-full rounded-2xl border border-[#262a3e] bg-[#161926] py-3.5 pl-10 pr-10 text-xs text-white placeholder:text-[#8e95af] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all"
              />
              <ChevronRight className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e95af]" />
            </div>
          </div>

          {/* 6. Bottom Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleApply}
              className="btn-primary w-full py-4 text-sm font-extrabold tracking-wide rounded-2xl shadow-lg shadow-indigo-950/50 hover:bg-[#4f46e5] active:scale-[0.99] transition-all"
            >
              Show All Events
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
