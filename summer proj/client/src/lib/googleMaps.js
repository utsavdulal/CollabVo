const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

let googleMapsPromise = null;

export function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (window.google && window.google.maps && window.google.maps.Map) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsPromise) return googleMapsPromise;

  if (!API_KEY) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured in .env'));
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // 1. If already on window with Map constructor ready
    if (window.google && window.google.maps && window.google.maps.Map) {
      return resolve(window.google.maps);
    }

    const callbackName = `__googleMapsCallback_${Date.now()}`;

    window[callbackName] = async () => {
      delete window[callbackName];
      try {
        if (window.google?.maps?.importLibrary) {
          await Promise.all([
            window.google.maps.importLibrary('maps'),
            window.google.maps.importLibrary('places'),
            window.google.maps.importLibrary('geometry'),
            window.google.maps.importLibrary('marker')
          ]);
        }
        if (window.google?.maps?.Map) {
          resolve(window.google.maps);
        } else {
          // Fallback poll if still initializing
          let attempts = 0;
          const poll = setInterval(() => {
            attempts++;
            if (window.google?.maps?.Map) {
              clearInterval(poll);
              resolve(window.google.maps);
            } else if (attempts > 30) {
              clearInterval(poll);
              reject(new Error('Google Maps Map constructor failed to initialize'));
            }
          }, 100);
        }
      } catch (err) {
        if (window.google?.maps?.Map) {
          resolve(window.google.maps);
        } else {
          reject(err);
        }
      }
    };

    // 2. Check if script tag already exists in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (window.google && window.google.maps && window.google.maps.Map) {
          clearInterval(poll);
          resolve(window.google.maps);
        } else if (attempts > 60) {
          clearInterval(poll);
          reject(new Error('Google Maps Map constructor timeout'));
        }
      }, 100);
      return;
    }

    // 3. Inject standard callback script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry,marker&callback=${callbackName}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => {
      googleMapsPromise = null;
      delete window[callbackName];
      reject(new Error('Failed to load Google Maps script from Google servers'));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/**
 * Calculates straight line distance in km between two [lng, lat] coordinates
 */
export function calculateDistanceKm(coord1, coord2) {
  if (!coord1 || !coord2 || (coord1[0] === 0 && coord1[1] === 0) || (coord2[0] === 0 && coord2[1] === 0)) {
    return null;
  }
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Parses Google Place address components into city, state, country, and address string
 */
export function parsePlaceDetails(place) {
  if (!place) return null;
  const components = place.address_components || [];
  let city = '';
  let state = '';
  let country = 'Nepal';

  for (const c of components) {
    const types = c.types || [];
    if (types.includes('locality')) city = c.long_name;
    else if (!city && types.includes('sublocality_level_1')) city = c.long_name;
    else if (!city && types.includes('administrative_area_level_2')) city = c.long_name;

    if (types.includes('administrative_area_level_1')) state = c.long_name;
    if (types.includes('country')) country = c.long_name;
  }

  const lat = place.geometry?.location?.lat() || 0;
  const lng = place.geometry?.location?.lng() || 0;

  return {
    coordinates: [lng, lat],
    address: place.formatted_address || place.name || '',
    city,
    state,
    country
  };
}
