import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search, AlertCircle, Loader2 } from 'lucide-react';
import { loadGoogleMaps, parsePlaceDetails } from '../../lib/googleMaps.js';

export function GoogleLocationPicker({ value, onChange, placeholder = 'Search location or business address...' }) {
  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [locating, setLocating] = useState(false);

  const defaultCoords = [85.324, 27.7172]; // Kathmandu [lng, lat]
  const currentCoords = value?.coordinates && (value.coordinates[0] !== 0 || value.coordinates[1] !== 0)
    ? value.coordinates
    : defaultCoords;

  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const centerLatLng = { lat: currentCoords[1], lng: currentCoords[0] };

        // Initialize Map
        const map = new maps.Map(mapContainerRef.current, {
          center: centerLatLng,
          zoom: value?.coordinates && value.coordinates[0] !== 0 ? 15 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels.text',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });
        mapRef.current = map;

        // Initialize Draggable Marker
        const marker = new maps.Marker({
          position: centerLatLng,
          map,
          draggable: true,
          animation: maps.Animation.DROP,
          title: 'Drag to pinpoint exact location'
        });
        markerRef.current = marker;

        const geocoder = new maps.Geocoder();

        const updateFromLatLng = (lat, lng) => {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const parsed = parsePlaceDetails(results[0]);
              if (searchInputRef.current) {
                searchInputRef.current.value = parsed.address;
              }
              onChange?.({
                type: 'Point',
                coordinates: [lng, lat],
                address: parsed.address,
                city: parsed.city,
                state: parsed.state,
                country: parsed.country
              });
            } else {
              onChange?.({
                type: 'Point',
                coordinates: [lng, lat],
                address: value?.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                city: value?.city || '',
                state: value?.state || '',
                country: value?.country || 'Nepal'
              });
            }
          });
        };

        // Marker Drag Event
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) {
            updateFromLatLng(pos.lat(), pos.lng());
          }
        });

        // Map Click Event
        map.addListener('click', (e) => {
          const latLng = e.latLng;
          if (latLng) {
            marker.setPosition(latLng);
            updateFromLatLng(latLng.lat(), latLng.lng());
          }
        });

        // Places Autocomplete
        if (searchInputRef.current) {
          const autocomplete = new maps.places.Autocomplete(searchInputRef.current, {
            fields: ['geometry', 'formatted_address', 'name', 'address_components']
          });
          autocompleteRef.current = autocomplete;
          autocomplete.bindTo('bounds', map);

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            map.setCenter(place.geometry.location);
            map.setZoom(16);
            marker.setPosition(place.geometry.location);

            const parsed = parsePlaceDetails(place);
            onChange?.({
              type: 'Point',
              coordinates: [lng, lat],
              address: parsed.address,
              city: parsed.city,
              state: parsed.state,
              country: parsed.country
            });
          });
        }

        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err.message || 'Failed to load Google Maps');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update marker position if coordinates change externally
  useEffect(() => {
    if (mapRef.current && markerRef.current && value?.coordinates) {
      const [lng, lat] = value.coordinates;
      if (lat !== 0 || lng !== 0) {
        const newPos = { lat, lng };
        markerRef.current.setPosition(newPos);
      }
    }
  }, [value?.coordinates?.[0], value?.coordinates?.[1]]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        if (mapRef.current && markerRef.current) {
          const latLng = { lat, lng };
          mapRef.current.setCenter(latLng);
          mapRef.current.setZoom(16);
          markerRef.current.setPosition(latLng);

          // Reverse geocode
          if (window.google && window.google.maps) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: latLng }, (results, status) => {
              if (status === 'OK' && results?.[0]) {
                const parsed = parsePlaceDetails(results[0]);
                if (searchInputRef.current) searchInputRef.current.value = parsed.address;
                onChange?.({
                  type: 'Point',
                  coordinates: [lng, lat],
                  address: parsed.address,
                  city: parsed.city,
                  state: parsed.state,
                  country: parsed.country
                });
              }
            });
          }
        }
      },
      () => {
        setLocating(false);
        alert('Could not retrieve your location. Please check your browser location permissions.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2.5">
      {/* Search Input & GPS Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            defaultValue={value?.address || ''}
            placeholder={placeholder}
            className="input pl-9 pr-3 text-xs w-full"
          />
        </div>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={locating}
          title="Use my current GPS location"
          className="btn-secondary py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 shrink-0"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> : <Navigation className="h-4 w-4 text-indigo-600" />}
          <span className="hidden sm:inline">My Location</span>
        </button>
      </div>

      {/* Map Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-[#262a3e] bg-zinc-100 dark:bg-[#161926] h-60 w-full shadow-inner">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/50 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-zinc-50 dark:bg-[#161926]">
            <AlertCircle className="h-6 w-6 text-amber-500 mb-1.5" />
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Unable to load Google Maps</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{loadError}</p>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Selected Coordinates & Address Hint */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 px-1">
        <span className="truncate flex items-center gap-1">
          <MapPin className="h-3 w-3 text-indigo-600 shrink-0" />
          {value?.address || 'Click or drag the marker to set precise location'}
        </span>
        {value?.coordinates && (value.coordinates[0] !== 0 || value.coordinates[1] !== 0) && (
          <span className="text-[10px] font-mono text-zinc-400 shrink-0 ml-2">
            {value.coordinates[1].toFixed(4)}°N, {value.coordinates[0].toFixed(4)}°E
          </span>
        )}
      </div>
    </div>
  );
}
