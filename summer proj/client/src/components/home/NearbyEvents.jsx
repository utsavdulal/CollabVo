import { useEffect, useState } from 'react';
import { MapPin, List, Navigation, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { loadMaps, hasMapsKey } from '../../lib/maps.js';
import { EventCard } from './EventCard.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { useAuthStore } from '../../store/authStore.js';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NearbyEvents() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [radius, setRadius] = useState(25);

  const myLoc = user?.location?.coordinates || [77.2, 28.6];
  const myLat = myLoc[1] || 28.6;
  const myLng = myLoc[0] || 77.2;

  useEffect(() => {
    setLoading(true);
    api(`/events/nearby?lat=${myLat}&lng=${myLng}&radiusKm=${radius}`)
      .then((d) => setEvents(d.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [radius, myLat, myLng]);

  useEffect(() => {
    if (view !== 'map' || !hasMapsKey) return;
    let mapObj;
    loadMaps()
      .then((google) => {
        const el = document.getElementById('nearby-map');
        if (!el) return;
        mapObj = new google.maps.Map(el, {
          center: { lat: myLat, lng: myLng },
          zoom: radius <= 10 ? 13 : radius <= 25 ? 11 : 9
        });
        for (const ev of events) {
          const [lng, lat] = ev.location?.coordinates || [0, 0];
          if (!lat && !lng) continue;
          const dist = haversine(myLat, myLng, lat, lng);
          const infowindow = new google.maps.InfoWindow({
            content: `<div style="padding:4px"><strong>${ev.title}</strong><br/><span style="font-size:11px;color:#666">${dist.toFixed(1)} km away</span><br/><a href="/event/${ev._id}" style="color:#09090b;font-size:11px;font-weight:bold">View Campaign &rarr;</a></div>`
          });
          const marker = new google.maps.Marker({ position: { lat, lng }, map: mapObj, title: ev.title });
          marker.addListener('click', () => infowindow.open(mapObj, marker));
        }
      })
      .catch(() => {});
    return () => { mapObj = null; };
  }, [view, events, myLat, myLng, radius]);

  const delta = radius <= 10 ? 0.05 : radius <= 25 ? 0.12 : 0.25;

  return (
    <section className="rounded-2xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-5 shadow-xs">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-zinc-900 dark:text-white" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Nearby Opportunities</h2>
          <span className="rounded-full bg-zinc-100 dark:bg-[#202438] px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
            {events.length} found
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Radius selector */}
          <div className="flex items-center gap-1">
            {[5, 10, 25, 50].map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setRadius(km)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  radius === km ? 'bg-zinc-900 text-white' : 'text-zinc-500 dark:text-[#8e95af] hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {km}km
              </button>
            ))}
          </div>

          {/* List/Map toggle */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#121522] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                view === 'list' ? 'bg-white dark:bg-[#161926] text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-[#8e95af] hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <List className="h-3 w-3" /> List
            </button>
            <button
              type="button"
              onClick={() => setView('map')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                view === 'map' ? 'bg-white dark:bg-[#161926] text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-[#8e95af] hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="h-3 w-3" /> Map
            </button>
          </div>
        </div>
      </div>

      {view === 'map' ? (
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#121522]">
          {hasMapsKey ? (
            <div id="nearby-map" className="h-72 w-full" />
          ) : (
            <div className="relative h-72 w-full">
              <iframe
                title="Nearby Map"
                className="h-full w-full border-0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${myLng - delta}%2C${myLat - delta * 0.7}%2C${myLng + delta}%2C${myLat + delta * 0.7}&layer=mapnik&marker=${myLat}%2C${myLng}`}
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-[#161926]/95 px-3 py-1 text-[11px] font-bold text-zinc-800 dark:text-zinc-100 shadow-sm backdrop-blur-xs">
                <Navigation className="h-3 w-3 text-zinc-900 dark:text-white" />
                <span>Centered on Your Location ({radius}km)</span>
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="border-t border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Campaigns in this radius
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {events.map((ev) => {
                  const [lng, lat] = ev.location?.coordinates || [0, 0];
                  const dist = lat && lng ? haversine(myLat, myLng, lat, lng) : null;
                  return (
                    <Link
                      key={ev._id}
                      to={`/event/${ev._id}`}
                      className="flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#121522] px-3 py-2 text-xs hover:border-zinc-900 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">{ev.title}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-[#8e95af]">
                          {dist != null ? `${dist.toFixed(1)} km away` : ev.location?.address || 'Nearby'}
                        </p>
                      </div>
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 dark:border-[#262a3e] p-6 text-center text-xs text-zinc-400">
          No campaigns found within {radius} km of your location.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 3).map((ev) => {
            const [lng, lat] = ev.location?.coordinates || [0, 0];
            const dist = lat && lng ? haversine(myLat, myLng, lat, lng) : null;
            return <EventCard key={ev._id} event={ev} distance={dist != null ? dist.toFixed(1) : null} />;
          })}
        </div>
      )}
    </section>
  );
}
