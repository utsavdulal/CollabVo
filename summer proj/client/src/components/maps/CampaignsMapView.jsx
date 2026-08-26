import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Calendar, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { loadGoogleMaps, calculateDistanceKm } from '../../lib/googleMaps.js';

export function CampaignsMapView({ items = [], userLocation, height = 'h-[500px]' }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Default Center (Kathmandu, Nepal or user location)
  const defaultCenter = userLocation?.coordinates && (userLocation.coordinates[0] !== 0 || userLocation.coordinates[1] !== 0)
    ? { lat: userLocation.coordinates[1], lng: userLocation.coordinates[0] }
    : { lat: 27.7172, lng: 85.324 };

  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const map = new maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true
        });
        mapRef.current = map;

        const infoWindow = new maps.InfoWindow();
        infoWindowRef.current = infoWindow;

        // User Location Marker (Blue dot)
        if (userLocation?.coordinates && (userLocation.coordinates[0] !== 0 || userLocation.coordinates[1] !== 0)) {
          new maps.Marker({
            position: { lat: userLocation.coordinates[1], lng: userLocation.coordinates[0] },
            map,
            title: 'Your Location',
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          });
        }

        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load map');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update Markers when items list change
  useEffect(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    const maps = window.google.maps;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new maps.LatLngBounds();
    let hasCoords = false;

    items.forEach((item) => {
      const coords = item.location?.coordinates || [0, 0];
      const [lng, lat] = coords;
      if (lat === 0 && lng === 0) return;

      hasCoords = true;
      const position = { lat, lng };
      bounds.extend(position);

      const marker = new maps.Marker({
        position,
        map,
        title: item.title || item.name,
        animation: maps.Animation.DROP
      });

      marker.addListener('click', () => {
        setSelectedItem(item);
      });

      markersRef.current.push(marker);
    });

    if (hasCoords && markersRef.current.length > 1) {
      map.fitBounds(bounds, 50);
    }
  }, [items]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-zinc-200/80 dark:border-[#262a3e] bg-zinc-100 dark:bg-[#161926] shadow-xs">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/60 z-20">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
          <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Google Maps Unavailable</p>
          <p className="text-xs text-zinc-500 dark:text-[#8e95af] mt-1">{error}</p>
        </div>
      )}

      {/* Map Element */}
      <div ref={mapContainerRef} className={`w-full ${height}`} />

      {/* Floating Selected Campaign Card Preview */}
      {selectedItem && (
        <div className="absolute bottom-4 inset-x-4 sm:left-4 sm:right-auto sm:max-w-md z-20">
          <div className="rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-4 shadow-xl flex items-start gap-3.5">
            {selectedItem.image ? (
              <img
                src={selectedItem.image}
                alt={selectedItem.title}
                className="h-16 w-16 rounded-xl object-cover shrink-0 border border-zinc-100 dark:border-zinc-800"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <MapPin className="h-6 w-6" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {selectedItem.title || selectedItem.name}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white text-xs font-bold px-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {selectedItem.location?.address || 'Location on map'}
              </p>

              {selectedItem.budget !== undefined && (
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{selectedItem.budget.toLocaleString()}
                </p>
              )}

              {userLocation?.coordinates && selectedItem.location?.coordinates && (
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  📍 {calculateDistanceKm(userLocation.coordinates, selectedItem.location.coordinates)} km away from you
                </p>
              )}

              <Link
                to={selectedItem.budget !== undefined ? `/event/${selectedItem._id}` : `/profile/${selectedItem._id}`}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View Details <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
