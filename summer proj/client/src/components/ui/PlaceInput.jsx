import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { loadMaps, hasMapsKey } from '../../lib/maps.js';

const CREATOR_CATEGORIES = ['beauty', 'fashion', 'gaming', 'tech', 'fitness', 'food', 'travel', 'music', 'comedy', 'education'];
const BUSINESS_CATEGORIES = ['retail', 'food', 'tech', 'fashion', 'beauty', 'entertainment', 'services'];

export function PlaceInput({ value, onChange }) {
  const inputRef = useRef(null);
  const [manual, setManual] = useState({ address: value?.address || '', lat: value?.coordinates?.[1] || '', lng: value?.coordinates?.[0] || '' });

  useEffect(() => {
    if (!hasMapsKey || !inputRef.current) return;
    let autocomplete;
    let cancelled = false;
    loadMaps()
      .then((google) => {
        if (cancelled) return;
        autocomplete = new google.maps.places.Autocomplete(inputRef.current, { fields: ['geometry', 'formatted_address'] });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place?.geometry) {
            onChange({
              address: place.formatted_address || inputRef.current.value,
              coordinates: [place.geometry.location.lng(), place.geometry.location.lat()]
            });
          }
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      google?.event?.removeListener?.(autocomplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (hasMapsKey) {
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          defaultValue={value?.address || ''}
          className="input pl-9"
          placeholder="Search your location"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={manual.address}
          onChange={(e) => {
            setManual((m) => ({ ...m, address: e.target.value }));
            onChange({ address: e.target.value, coordinates: [Number(manual.lng) || 0, Number(manual.lat) || 0] });
          }}
          className="input pl-9"
          placeholder="City or area name"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="any"
          value={manual.lat}
          onChange={(e) => {
            setManual((m) => ({ ...m, lat: e.target.value }));
            onChange({ address: manual.address, coordinates: [Number(manual.lng) || 0, Number(e.target.value) || 0] });
          }}
          className="input"
          placeholder="Latitude"
        />
        <input
          type="number"
          step="any"
          value={manual.lng}
          onChange={(e) => {
            setManual((m) => ({ ...m, lng: e.target.value }));
            onChange({ address: manual.address, coordinates: [Number(e.target.value) || 0, Number(manual.lat) || 0] });
          }}
          className="input"
          placeholder="Longitude"
        />
      </div>
    </div>
  );
}

export function getCategories(role) {
  return role === 'business' ? BUSINESS_CATEGORIES : CREATOR_CATEGORIES;
}
