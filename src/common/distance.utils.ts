export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

export function calculateEstimatedTime(distanceKm: number, averageSpeedKph: number = 30): number {
  // Calculate estimated time in minutes
  return Math.round((distanceKm / averageSpeedKph) * 60);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function findNearestLocations(
  targetLat: number,
  targetLon: number,
  locations: Array<{
    [key: string]: any;
    latitude: number;
    longitude: number;
  }>,
  maxRadiusKm: number = 5,
): Array<{
  [key: string]: any;
  latitude: number;
  longitude: number;
  distance: number;
}> {
  return locations
    .map(location => ({
      ...location,
      distance: calculateDistance(
        targetLat,
        targetLon,
        location.latitude,
        location.longitude,
      ),
    }))
    .filter(location => location.distance <= maxRadiusKm)
    .sort((a, b) => a.distance - b.distance);
}
