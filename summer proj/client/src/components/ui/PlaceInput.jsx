import { useEffect, useState } from 'react';
import { MapPin, Globe, Compass, Navigation, Map, ChevronDown, ChevronUp } from 'lucide-react';
import { COUNTRIES, NEPAL_PROVINCES } from '../../lib/paymentData.jsx';
import { GoogleLocationPicker } from '../maps/GoogleLocationPicker.jsx';
import { CityAutocomplete } from './CityAutocomplete.jsx';

const CREATOR_CATEGORIES = ['beauty', 'fashion', 'gaming', 'tech', 'fitness', 'food', 'travel', 'music', 'comedy', 'education'];
const BUSINESS_CATEGORIES = ['retail', 'food', 'tech', 'fashion', 'beauty', 'entertainment', 'services'];

export function PlaceInput({ value, onChange, showMapDefault = true }) {
  const [country, setCountry] = useState(value?.country || 'Nepal');
  const [state, setState] = useState(value?.state || 'Bagmati Province');
  const [city, setCity] = useState(value?.city || '');
  const [showMap, setShowMap] = useState(showMapDefault);

  useEffect(() => {
    if (value) {
      if (value.country) setCountry(value.country);
      if (value.state) setState(value.state);
      if (value.city) setCity(value.city);
    }
  }, [value?.country, value?.state, value?.city]);

  const updateLocation = (newCountry, newState, newCity) => {
    const parts = [newCity?.trim(), newState?.trim(), newCountry?.trim()].filter(Boolean);
    const formattedAddress = parts.join(', ');

    onChange({
      type: 'Point',
      coordinates: value?.coordinates || [0, 0],
      country: newCountry,
      state: newState,
      city: newCity,
      address: formattedAddress
    });
  };

  const handleCountryChange = (e) => {
    const val = e.target.value;
    setCountry(val);
    const nextState = val === 'Nepal' ? (NEPAL_PROVINCES.includes(state) ? state : NEPAL_PROVINCES[0]) : '';
    setState(nextState);
    updateLocation(val, nextState, city);
  };

  const handleStateChange = (e) => {
    const val = e.target.value;
    setState(val);
    updateLocation(country, val, city);
  };

  const handleCityChange = (e) => {
    const val = e.target.value;
    setCity(val);
    updateLocation(country, state, val);
  };

  const handleMapLocationChange = (mapLocation) => {
    if (mapLocation.city) setCity(mapLocation.city);
    if (mapLocation.state) setState(mapLocation.state);
    if (mapLocation.country) setCountry(mapLocation.country);

    onChange({
      type: 'Point',
      coordinates: mapLocation.coordinates || [0, 0],
      country: mapLocation.country || country,
      state: mapLocation.state || state,
      city: mapLocation.city || city,
      address: mapLocation.address || [city, state, country].filter(Boolean).join(', ')
    });
  };

  return (
    <div className="space-y-3">
      {/* Interactive Google Map & Autocomplete */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Map className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Google Map &amp; Exact Pin
          </label>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            {showMap ? (
              <>Hide Map <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Show Pin Map <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        </div>

        {showMap && (
          <div className="mb-3">
            <GoogleLocationPicker
              value={value}
              onChange={handleMapLocationChange}
              placeholder="Search store name, street address or landmark..."
            />
          </div>
        )}
      </div>

      {/* Row 1: Country & State/Province */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
            Country
          </label>
          <select
            value={country}
            onChange={handleCountryChange}
            className="input py-2 text-xs bg-white dark:bg-zinc-800"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
            State / Province
          </label>
          {country === 'Nepal' ? (
            <select
              value={state}
              onChange={handleStateChange}
              className="input py-2 text-xs bg-white dark:bg-zinc-800"
            >
              {NEPAL_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={state}
              onChange={handleStateChange}
              className="input py-2 text-xs"
              placeholder="State or Province"
            />
          )}
        </div>
      </div>

      {/* Row 2: City */}
      <div>
        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
          City / Town
        </label>
        <CityAutocomplete
          value={city}
          country={country}
          onChange={(newCity) => {
            setCity(newCity);
            updateLocation(country, state, newCity);
          }}
          placeholder={`Search cities in ${country}...`}
        />
      </div>
    </div>
  );
}

export function getCategories(role) {
  return role === 'business' ? BUSINESS_CATEGORIES : CREATOR_CATEGORIES;
}
