import { useEffect, useRef, useState } from 'react';
import { MapPin, ExternalLink, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import { loadGoogleMaps } from '../../lib/googleMaps.js';

export function GoogleMapViewer({
  coordinates = [0, 0],
  address = '',
  title = 'Location',
  height = 'h-52',
  zoom = 15,
  showDirectionsButton = true
}) {
  const mapContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [lng, lat] = coordinates || [0, 0];
  const hasValidCoords = lat !== 0 || lng !== 0;

  useEffect(() => {
    if (!hasValidCoords) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const center = { lat, lng };

        const map = new maps.Map(mapContainerRef.current, {
          center,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true
        });

        // Add Marker
        const marker = new maps.Marker({
          position: center,
          map,
          title: address || title
        });

        // Add InfoWindow
        const infoWindow = new maps.InfoWindow({
          content: `<div style="padding:4px; font-family:sans-serif;">
            <strong style="font-size:12px; display:block; margin-bottom:2px;">${title}</strong>
            <span style="font-size:11px; color:#666;">${address}</span>
          </div>`
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

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
  }, [lat, lng, zoom, address, title]);

  const mapsUrl = hasValidCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  if (!hasValidCoords && !address) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] overflow-hidden shadow-xs">
      {/* Header Info */}
      <div className="p-4 flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-[#262a3e]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
            <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">{title}</span>
          </div>
          {address && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate pl-5.5">
              {address}
            </p>
          )}
        </div>

        {showDirectionsButton && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1 shrink-0 bg-indigo-600 hover:bg-indigo-700"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Directions</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Map Display */}
      {hasValidCoords ? (
        <div className={`relative w-full ${height} bg-zinc-100 dark:bg-[#161926]`}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/50 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mb-1" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Map view unavailable</p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                View on Google Maps <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      ) : (
        <div className="p-4 bg-zinc-50 dark:bg-[#161926] text-center">
          <p className="text-xs text-zinc-500">{address}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
          >
            Open in Google Maps <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
