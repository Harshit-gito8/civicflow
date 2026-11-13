/**
 * Geospatial Clustering & Haversine Geofence Verification Utilities
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates Great-Circle distance between two coordinates in meters using Haversine formula
 * @param {[number, number]} coord1 - [longitude, latitude]
 * @param {[number, number]} coord2 - [longitude, latitude]
 * @returns {number} distance in meters
 */
export function haversineDistance(coord1, coord2) {
  if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) {
    return Infinity;
  }

  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Verifies if field contractor photo upload location is within geofenced threshold of the defect
 * @param {[number, number]} incidentCoords - [longitude, latitude]
 * @param {[number, number]} uploadCoords - [longitude, latitude]
 * @param {number} thresholdMeters - default 35m
 */
export function verifyProofOfWorkGeofence(incidentCoords, uploadCoords, thresholdMeters = 35) {
  const distance = haversineDistance(incidentCoords, uploadCoords);
  const roundedDist = Math.round(distance * 10) / 10;
  const isWithin = distance <= thresholdMeters;

  return {
    isVerified: isWithin,
    distanceMeters: roundedDist,
    thresholdMeters,
    statusMessage: isWithin
      ? `Geofence verified (${roundedDist}m <= ${thresholdMeters}m threshold)`
      : `Geofence violation: Uploaded from ${roundedDist}m away (threshold is ${thresholdMeters}m). Rejected to prevent fraudulent billing.`
  };
}

/**
 * Searches for an active master ticket within cluster radius (50m) of the same category
 * Works with MongoDB $nearSphere or fallback in-memory distance search
 */
export async function findNearbyMasterTicket(coordinates, category, IncidentModel, radiusMeters = 50) {
  const [lng, lat] = coordinates;

  try {
    // 1. First try native MongoDB 2dsphere spatial search
    const nearbyMaster = await IncidentModel.findOne({
      category,
      isMasterTicket: true,
      status: { $in: ['REPORTED', 'TRIAGED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] },
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radiusMeters,
        },
      },
    });

    if (nearbyMaster) return nearbyMaster;
  } catch (err) {
    // 2. Fallback to Haversine calculation across active candidate tickets
    const activeCandidates = await IncidentModel.find({
      category,
      isMasterTicket: true,
      status: { $in: ['REPORTED', 'TRIAGED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] },
    });

    for (const candidate of activeCandidates) {
      if (candidate.location && candidate.location.coordinates) {
        const dist = haversineDistance(coordinates, candidate.location.coordinates);
        if (dist <= radiusMeters) {
          return candidate;
        }
      }
    }
  }

  return null;
}
