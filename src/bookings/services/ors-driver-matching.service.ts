import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from 'src/driver/entities/driver.entity';
import { OrsBatchRouteService } from 'src/External-apis/ors-batch-routes';
import { DriverMatchResponseDto } from '../dto/match-driver.dto';
import { calculateDistance } from 'src/common/distance.utils';

@Injectable()
export class ORSDriverMatchingService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    private orsBatchRouteService: OrsBatchRouteService,
  ) {}

  async findNearestDriverByORS(
    startLat: number,
    startLng: number,
    maxRadiusKm: number = 5,
    maxResults: number = 10
  ): Promise<DriverMatchResponseDto[]> {
    return this.findNearestDriverByHaversine(startLat, startLng, maxRadiusKm, maxResults);
  }

  async findNearestDriverByHaversine(
    startLat: number,
    startLng: number,
    maxRadiusKm: number = 5,
    maxResults: number = 10
  ): Promise<DriverMatchResponseDto[]> {
    const availableDrivers = await this.driverRepository
      .createQueryBuilder('driver')
      .where('driver.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('driver.latitude IS NOT NULL')
      .andWhere('driver.longitude IS NOT NULL')
      .getMany();

    if (availableDrivers.length === 0) {
      return [];
    }

    // Use Haversine formula for distance calculation
    const driversWithDistance = availableDrivers
      .filter(driver => driver.driver_id !== undefined)
      .map(driver => {
        const distance = calculateDistance(
          startLat,
          startLng,
          driver.latitude,
          driver.longitude
        );
        
        return {
          driver,
          distance,
          duration: this.estimateDuration(distance), // Estimate duration based on distance
        };
      })
      .filter(result => result.distance <= maxRadiusKm)
      .sort((a, b) => a.distance - b.distance);

    if (driversWithDistance.length === 0) {
      return [];
    }

    const results: DriverMatchResponseDto[] = [];
    
    for (const result of driversWithDistance.slice(0, maxResults)) {
      const driver = result.driver;
      
      // Generate basic route instructions (simplified for Haversine)
      const routeInstructions = await this.generateBasicRouteInstructions(
        driver.latitude,
        driver.longitude,
        startLat,
        startLng,
        result.distance
      );

      results.push({
        driverId: driver.driver_id!,
        latitude: driver.latitude,
        longitude: driver.longitude,
        distance: result.distance,
        lastUpdate: new Date().getTime(),
        estimatedTimeToPickup: Math.round(result.duration / 60), // Convert to minutes
        routeInstructions: routeInstructions,
        totalDistance: result.distance * 1000, // Convert to meters
        totalDuration: result.duration,
      });
    }

    return results;
  }

  private estimateDuration(distanceKm: number): number {
    // Estimate duration assuming average speed of 30 km/h
    const averageSpeedKph = 30;
    const trafficMultiplier = 1.2; // Account for traffic
    return (distanceKm / averageSpeedKph) * 3600 * trafficMultiplier; // Return in seconds
  }

  private async generateBasicRouteInstructions(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    distanceKm: number
  ): Promise<string[]> {
    try {
      // Try to get detailed instructions from ORS first
      const route = await this.orsBatchRouteService['orsMapService'].getRouteWithInstructions(
        fromLat,
        fromLng,
        toLat,
        toLng
      );
      
      if (route && route.formattedInstructions && route.formattedInstructions.length > 0) {
        return route.formattedInstructions;
      }
    } catch (error) {
      console.warn('ORS route instructions failed, using basic instructions:', error);
    }

    // Fallback to basic instructions based on Haversine distance
    const direction = this.getBasicDirection(fromLat, fromLng, toLat, toLng);
    const estimatedTime = Math.round(this.estimateDuration(distanceKm) / 60);
    
    return [
      `Head ${direction} for approximately ${distanceKm.toFixed(1)} km`,
      `Estimated travel time: ${estimatedTime} minutes`,
      `Destination will be on your ${direction}`
    ];
  }

  private getBasicDirection(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
    const latDiff = toLat - fromLat;
    const lngDiff = toLng - fromLng;
    
    if (Math.abs(latDiff) > Math.abs(lngDiff)) {
      return latDiff > 0 ? 'north' : 'south';
    } else {
      return lngDiff > 0 ? 'east' : 'west';
    }
  }

  // Keep the original ORS method for backward compatibility
  async findNearestDriverByORSLegacy(
    startLat: number,
    startLng: number,
    maxRadiusKm: number = 5,
    maxResults: number = 10
  ): Promise<DriverMatchResponseDto[]> {
    const availableDrivers = await this.driverRepository
      .createQueryBuilder('driver')
      .where('driver.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('driver.latitude IS NOT NULL')
      .andWhere('driver.longitude IS NOT NULL')
      .getMany();

    if (availableDrivers.length === 0) {
      return [];
    }

    const orsResults = await this.orsBatchRouteService.getRoutesFromMultipleSources(
      startLat,
      startLng,
      availableDrivers
        .filter(driver => driver.driver_id !== undefined)
        .map(driver => ({
          lat: driver.latitude,
          lng: driver.longitude,
          driverId: driver.driver_id!,
        }))
    );

    if (orsResults.length === 0) {
      return [];
    }

    const filteredResults = orsResults
      .filter(result => result.distance / 1000 <= maxRadiusKm)
      .sort((a, b) => a.distance - b.distance);

    if (filteredResults.length === 0) {
      return [];
    }

    const results: DriverMatchResponseDto[] = [];
    
    for (const result of filteredResults.slice(0, maxResults)) {
      const driver = availableDrivers.find(d => d.driver_id === result.driverId);
      if (!driver) continue;

      const routeInstructions = await this.generateRouteInstructions(
        driver.latitude,
        driver.longitude,
        startLat,
        startLng
      );

      results.push({
        driverId: driver.driver_id!,
        latitude: driver.latitude,
        longitude: driver.longitude,
        distance: result.distance / 1000, // Convert to km
        lastUpdate: new Date().getTime(),
        estimatedTimeToPickup: Math.round(result.duration / 60), // Convert to minutes
        routeInstructions: routeInstructions,
        totalDistance: result.distance,
        totalDuration: result.duration,
      });
    }

    return results;
  }

  private async generateRouteInstructions(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<string[]> {
    try {
      const route = await this.orsBatchRouteService['orsMapService'].getRouteWithInstructions(
        fromLat,
        fromLng,
        toLat,
        toLng
      );
      
      return route.formattedInstructions || [];
    } catch (error) {
      console.error('Error generating route instructions:', error);
      return [];
    }
  }
}
