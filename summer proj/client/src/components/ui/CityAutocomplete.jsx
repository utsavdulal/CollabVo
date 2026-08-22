import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { loadGoogleMaps } from '../../lib/googleMaps.js';

/**
 * Maps country display names to ISO 3166-1 alpha-2 codes for Google Places API
 */
const COUNTRY_CODE_MAP = {
  'Nepal': 'np',
  'India': 'in',
  'United States': 'us',
  'United Kingdom': 'gb',
  'Australia': 'au',
  'Canada': 'ca',
  'United Arab Emirates': 'ae'
};

/**
 * CityAutocomplete — A Google Places-powered city dropdown.
 * Shows city suggestions as user types, filtered by the selected country.
 *
 * @param {{ value: string, country: string, onChange: (city: string) => void, placeholder?: string }} props
 */
export function CityAutocomplete({ value = '', country = 'Nepal', onChange, placeholder = 'Type city name...' }) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  const autocompleteServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Load Google Maps and create AutocompleteService
  useEffect(() => {
    loadGoogleMaps()
      .then((maps) => {
        if (maps.places && maps.places.AutocompleteService) {
          autocompleteServiceRef.current = new maps.places.AutocompleteService();
          sessionTokenRef.current = new maps.places.AutocompleteSessionToken();
          setMapsReady(true);
        } else if (maps.importLibrary) {
          maps.importLibrary('places').then((places) => {
            autocompleteServiceRef.current = new places.AutocompleteService();
            sessionTokenRef.current = new places.AutocompleteSessionToken();
            setMapsReady(true);
          });
        }
      })
      .catch(() => {
        // Maps not available — component falls back to plain text input
      });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(
    (input) => {
      if (!autocompleteServiceRef.current || !input || input.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);

      const countryCode = COUNTRY_CODE_MAP[country];
      const request = {
        input,
        types: ['(cities)'],
        sessionToken: sessionTokenRef.current
      };
      if (countryCode) {
        request.componentRestrictions = { country: countryCode };
      }

      autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
        setLoading(false);
        if (status === 'OK' && predictions) {
          setSuggestions(
            predictions.map((p) => ({
              placeId: p.place_id,
              mainText: p.structured_formatting?.main_text || p.description,
              secondaryText: p.structured_formatting?.secondary_text || '',
              description: p.description
            }))
          );
          setOpen(true);
        } else {
          setSuggestions([]);
        }
      });
    },
    [country]
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);

    // Debounce API calls
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelect = (suggestion) => {
    setQuery(suggestion.mainText);
    onChange(suggestion.mainText);
    setOpen(false);
    setSuggestions([]);

    // Refresh session token after a selection
    loadGoogleMaps().then((maps) => {
      if (maps.places?.AutocompleteSessionToken) {
        sessionTokenRef.current = new maps.places.AutocompleteSessionToken();
      }
    });
  };

  const handleFocus = () => {
    if (suggestions.length > 0) setOpen(true);
    if (query && query.length >= 2 && suggestions.length === 0) {
      fetchSuggestions(query);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 pointer-events-none z-10" />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-500 animate-spin pointer-events-none z-10" />
      )}
      {!loading && mapsReady && (
        <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 pointer-events-none z-10" />
      )}

      <input
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        className="input pl-8.5 pr-8 py-2 text-xs w-full"
        placeholder={mapsReady ? placeholder : 'e.g. Kathmandu, Pokhara, Lalitpur'}
        autoComplete="off"
      />

      {/* Dropdown Suggestions */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] shadow-xl max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s.placeId || i}
              type="button"
              onClick={() => handleSelect(s)}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-[#1e2240] transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <MapPin className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-zinc-900 dark:text-white truncate">
                  {s.mainText}
                </span>
                {s.secondaryText && (
                  <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                    {s.secondaryText}
                  </span>
                )}
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[9px] text-zinc-400 dark:text-zinc-600 text-right border-t border-zinc-100 dark:border-[#262a3e]">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
