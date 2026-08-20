import { Search, SlidersHorizontal, Menu, Sun, Moon } from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { useThemeStore } from '../../store/themeStore.js';
import { Avatar } from '../ui/Avatar.jsx';
import { useState, useEffect } from 'react';
import { FiltersModal } from '../home/FiltersModal.jsx';

export function TopBar({ onProfileClick, onMenuClick }) {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    eventType: searchParams.get('eventType') || 'Paid',
    budget: searchParams.get('budget') || 'Any budget',
    deadline: searchParams.get('deadline') || 'Any time',
    locationType: searchParams.get('locationType') || 'Onsite',
    city: searchParams.get('city') || ''
  });

  useEffect(() => {
    setQ(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearchChange = (val) => {
    setQ(val);
    const next = new URLSearchParams(searchParams);
    if (val.trim()) {
      next.set('q', val.trim());
    } else {
      next.delete('q');
    }
    if (location.pathname !== '/home') {
      navigate(`/home?${next.toString()}`);
    } else {
      setSearchParams(next, { replace: true });
    }
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    const next = new URLSearchParams(searchParams);
    if (newFilters.eventType && newFilters.eventType !== 'Paid') next.set('eventType', newFilters.eventType);
    else next.delete('eventType');

    if (newFilters.budget && newFilters.budget !== 'Any budget') next.set('budget', newFilters.budget);
    else next.delete('budget');

    if (newFilters.city) next.set('city', newFilters.city);
    else next.delete('city');

    if (newFilters.locationType) next.set('locationType', newFilters.locationType);
    else next.delete('locationType');

    setSearchParams(next, { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 border-b border-zinc-200/80 dark:border-[#262a3e] dark:bg-[#0c0e17]/95 px-4 py-3 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-5xl items-center gap-2.5">
        {/* User Avatar */}
        <button
          type="button"
          onClick={onProfileClick}
          className="shrink-0 transition-transform active:scale-95"
          aria-label="Profile"
        >
          <Avatar user={user} size="sm" />
        </button>

        {/* Search Bar with Filter Icon */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-[#8e95af]" />
          <input
            value={q}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search Events..."
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-10 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] dark:border-[#262a3e] dark:bg-[#161926] dark:text-white dark:placeholder:text-[#8e95af] transition-all"
          />
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-200/70 text-zinc-700 hover:bg-zinc-300 dark:bg-[#232542] dark:text-[#818cf8] dark:hover:bg-[#2e3157] transition-colors"
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Sun / Moon Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-amber-500 hover:bg-zinc-50 dark:border-[#262a3e] dark:bg-[#161926] dark:text-amber-400 dark:hover:bg-[#212538] transition-colors shadow-xs"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4.5 w-4.5" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-indigo-600" />
          )}
        </button>

        {/* Hamburger Menu Button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-[#262a3e] dark:bg-[#161926] dark:text-white dark:hover:bg-[#212538] transition-colors"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <FiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />
    </header>
  );
}
