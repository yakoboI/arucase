/**
 * Default "Open in Google Maps" / embed source when `social_location` is not set in CMS.
 * Place centroid matches Google’s listing for Arusha Catholic Seminary (Oldonyosambu).
 * Short form (no tracking query) so it fits legacy VARCHAR(255) until DB is migrated to TEXT.
 */
export const DEFAULT_GOOGLE_MAPS_LOCATION =
  'https://www.google.com/maps/place/Arusha+Catholic+Seminary-Oldonyosambu+Seminary/@-3.1558141,36.6991659,17z';
