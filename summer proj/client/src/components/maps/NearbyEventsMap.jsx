import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Navigation, Sparkles, AlertCircle, Loader2,
  ChevronDown, ArrowRight, ExternalLink, SlidersHorizontal, Locate
} from 'lucide-react';
import { loadGoogleMaps, calculateDistanceKm } from '../../lib/googleMaps.js';

const RADIUS_OPTIONS = [
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: '100 km', value: 100 },
  { label: 'All Nepal', value: 1000 }
];

export function NearbyEventsMap({
  events = [],
  userLocation,
  savedIds = [],
  onToggleSave
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const markersRef = useRef([]);

  const [radius, setRadius] = useState(25);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [customCenter, setCustomCenter] = useState(null);

  // Determine user center coordinates (fallback to Kathmandu if 0,0)
  const defaultCoords = [85.324, 27.7172];
  const userCoords = customCenter || (
    userLocation?.coordinates && (userLocation.coordinates[0] !== 0 || userLocation.coordinates[1] !== 0)
      ? userLocation.coordinates
      : defaultCoords
  );

  const centerLatLng = { lat: userCoords[1], lng: userCoords[0] };
  const userCityLabel = userLocation?.city || userLocation?.address?.split(',')?.[0] || 'Your Location';

  // Calculate distance for all events and filter by radius
  const eventsWithDistance = events
    .map((ev) => {
      const coords = ev.location?.coordinates;
      const distance = coords ? calculateDistanceKm(userCoords, coords) : null;
      return { ...ev, distance };
    })
    .filter((ev) => ev.distance !== null);

  const nearbyEvents = radius >= 1000
    ? eventsWithDistance
    : eventsWithDistance.filter((ev) => ev.distance <= radius);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const map = new maps.Map(mapContainerRef.current, {
          center: centerLatLng,
          zoom: radius <= 25 ? 12 : radius <= 50 ? 11 : 9,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels.text',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });
        mapRef.current = map;

        // User Location Center Marker (Blue Pulse Pin)
        const userMarker = new maps.Marker({
          position: centerLatLng,
          map,
          title: `You are here (${userCityLabel})`,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#4f46e5',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5
          }
        });
        userMarkerRef.current = userMarker;

        // Radius Overlay Circle
        if (radius < 1000) {
          const circle = new maps.Circle({
            strokeColor: '#6366f1',
            strokeOpacity: 0.8,
            strokeWeight: 1.5,
            fillColor: '#818cf8',
            fillOpacity: 0.12,
            map,
            center: centerLatLng,
            radius: radius * 1000 // Convert km to meters
          });
          radiusCircleRef.current = circle;
        }

        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load Google Maps');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userCoords[0], userCoords[1]]);

  // Update Radius Circle & Zoom when radius changes
  useEffect(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;
    const maps = window.google.maps;
    const map = mapRef.current;

    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
      radiusCircleRef.current = null;
    }

    if (radius < 1000) {
      const circle = new maps.Circle({
        strokeColor: '#6366f1',
        strokeOpacity: 0.8,
        strokeWeight: 1.5,
        fillColor: '#818cf8',
        fillOpacity: 0.12,
        map,
        center: centerLatLng,
        radius: radius * 1000
      });
      radiusCircleRef.current = circle;

      // Adjust zoom to fit circle
      const targetZoom = radius <= 10 ? 13 : radius <= 25 ? 12 : radius <= 50 ? 11 : 9;
      map.setZoom(targetZoom);
      map.setCenter(centerLatLng);
    } else {
      map.setZoom(8);
      map.setCenter(centerLatLng);
    }
  }, [radius]);

  // Update Event Markers on Map
  useEffect(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;
    const maps = window.google.maps;
    const map = mapRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    nearbyEvents.forEach((ev) => {
      const [lng, lat] = ev.location.coordinates;
      const marker = new maps.Marker({
        position: { lat, lng },
        map,
        title: ev.title,
        animation: maps.Animation.DROP
      });

      marker.addListener('click', () => {
        setSelectedEvent(ev);
      });

      markersRef.current.push(marker);
    });
  }, [nearbyEvents.length, radius]);

  const handleUseGPS = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const nextCoords = [pos.coords.longitude, pos.coords.latitude];
        setCustomCenter(nextCoords);
      },
      () => {
        setLocating(false);
        alert('Could not access current location. Please check browser permissions.');
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white dark:border-[#262a3e] dark:bg-[#1a1d2d] p-4 sm:p-5 shadow-sm space-y-3.5">
      {/* Header with Title, Location Pill & GPS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
              Nearby Campaigns
            </h2>
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-[#818cf8] px-2 py-0.5 text-[10px] font-bold">
              {nearbyEvents.length} found
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Brand events &amp; on-site collaboration opportunities near you
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Location Badge */}
          <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-[#121522] px-3 py-1 text-xs font-bold text-indigo-700 dark:text-[#818cf8] border border-zinc-200 dark:border-[#262a3e]">
            <MapPin className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-[200px]">{userCityLabel}</span>
          </div>

          {/* GPS Locate Button */}
          <button
            type="button"
            onClick={handleUseGPS}
            disabled={locating}
            title="Locate around my current GPS position"
            className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-[#121522] dark:hover:bg-[#202538] text-zinc-600 dark:text-zinc-300 transition-colors border border-zinc-200 dark:border-[#262a3e]"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> : <Locate className="h-4 w-4 text-indigo-600" />}
          </button>
        </div>
      </div>

      {/* Radius Switcher Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mr-1 flex items-center gap-1 shrink-0">
          <SlidersHorizontal className="h-3 w-3" /> Radius:
        </span>
        {RADIUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRadius(opt.value)}
            className={`rounded-xl px-3 py-1 text-xs font-bold transition-all shrink-0 ${
              radius === opt.value
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-[#161926] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Embedded Google Map Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-[#262a3e] bg-zinc-100 dark:bg-[#161926] h-64 sm:h-72 w-full shadow-inner">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/50 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="h-6 w-6 text-amber-500 mb-1" />
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Google Maps Unavailable</p>
            <p className="text-[11px] text-zinc-500">{error}</p>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Selected Event Popup Card Overlay */}
        {selectedEvent && (
          <div className="absolute bottom-3 inset-x-3 sm:left-3 sm:right-auto sm:max-w-xs z-10">
            <div className="rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-3 shadow-xl flex items-start gap-2.5">
              {selectedEvent.image ? (
                <img
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
                  className="h-12 w-12 rounded-xl object-cover shrink-0 border border-zinc-100 dark:border-zinc-800"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {selectedEvent.title}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="text-zinc-400 hover:text-zinc-600 text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ₹{selectedEvent.budget?.toLocaleString() || 'Negotiable'}
                  {selectedEvent.distance !== null && (
                    <span className="text-[10px] text-zinc-400 font-normal ml-1.5">
                      · {selectedEvent.distance} km away
                    </span>
                  )}
                </p>
                <Link
                  to={`/event/${selectedEvent._id}`}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-[#818cf8] hover:underline"
                >
                  View Details <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No Events in Radius Notice + Expand Prompt */}
      {nearbyEvents.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#121522] py-4 px-3 text-center">
          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            No events within {radius === 1000 ? 'Nepal' : `${radius} km`} of {userCityLabel}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5 mb-2.5">
            Expand your search radius to discover campaigns across Nepal.
          </p>
          <div className="flex items-center gap-2">
            {radius < 50 && (
              <button
                type="button"
                onClick={() => setRadius(50)}
                className="btn-secondary py-1.5 px-3 text-xs font-bold"
              >
                Expand to 50 km
              </button>
            )}
            {radius < 100 && (
              <button
                type="button"
                onClick={() => setRadius(100)}
                className="btn-secondary py-1.5 px-3 text-xs font-bold"
              >
                Expand to 100 km
              </button>
            )}
            <button
              type="button"
              onClick={() => setRadius(1000)}
              className="btn-primary py-1.5 px-3.5 text-xs font-bold"
            >
              Show All Across Nepal
            </button>
          </div>
        </div>
      )}

      {/* Horizontal Strip of Nearby Events */}
      {nearbyEvents.length > 0 && (
        <div className="pt-1">
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {nearbyEvents.map((ev) => (
              <Link
                key={ev._id}
                to={`/event/${ev._id}`}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-2.5 min-w-[220px] max-w-[260px] hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors shrink-0"
              >
                {ev.image ? (
                  <img
                    src={ev.image}
                    alt={ev.title}
                    className="h-11 w-11 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {ev.title}
                  </p>
                  <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                    ₹{ev.budget?.toLocaleString() || 'Negotiable'}
                  </p>
                  {ev.distance !== null && (
                    <p className="text-[10px] text-zinc-400">
                      📍 {ev.distance} km away
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
