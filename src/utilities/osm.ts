import type { Location } from '@/payload-types'

/** Link zu OpenStreetMap (externer Link statt eingebetteter Karte – keine Drittanbieter-Requests). */
export const osmLink = (loc: Pick<Location, 'latitude' | 'longitude' | 'street' | 'postalCode' | 'city'>) =>
  loc.latitude && loc.longitude
    ? `https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=17/${loc.latitude}/${loc.longitude}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${loc.street}, ${loc.postalCode} ${loc.city}`)}`
