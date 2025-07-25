import { Injectable } from '@nestjs/common';
import { OrsMapService } from './ors-maps';

@Injectable()
export class OrsBatchRouteService {
  constructor(private orsMapService: OrsMapService) {}

  async getRoutesFromMultipleSources(
    startLat: number,
    startLng: number,
    destinations: Array<{ lat: number; lng: number; driverId: number }>
  ): Promise<Array<{
    driverId: number;
    distance: number;
    duration: number;
    route: any;
  }>> {
    const results = await Promise.all(
      destinations.map(async (dest) => {
        try {
          const route = await this.orsMapService.getRouteWithInstructions(
            startLat,
            startLng,
            dest.lat,
            dest.lng
          );
          
          return {
            driverId: dest.driverId,
            distance: route.distance,
            duration: route.duration,
            route: route,
          };
        } catch (error) {
          console.error(`Error calculating route for driver ${dest.driverId}:`, error);
          return {
            driverId: dest.driverId,
            distance: Infinity,
            duration: Infinity,
            route: null,
          };
        }
      })
    );

    return results.filter(result => result.distance !== Infinity);
  }

  async getNearestDriverByORS(
    startLat: number,
    startLng: number,
    availableDrivers: Array<{
      driverId: number;
      latitude: number;
      longitude: number;
    }>
  ): Promise<{
    driverId: number;
    distance: number;
    duration: number;
    route: any;
  } | null> {
    if (availableDrivers.length === 0) return null;

    const destinations = availableDrivers.map(driver => ({
      lat: driver.latitude,
      lng: driver.longitude,
      driverId: driver.driverId,
    }));

    const routes = await this.getRoutesFromMultipleSources(
      startLat,
      startLng,
      destinations
    );

    if (routes.length === 0) return null;

    // Sort by driving distance
    routes.sort((a, b) => a.distance - b.distance);

    return routes[0];
  }
}
