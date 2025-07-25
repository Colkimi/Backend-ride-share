import { Injectable, NotFoundException, Inject, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, Label } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { OrsMapService } from 'src/External-apis/ors-maps';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { calculateDistance, findNearestLocations } from 'src/common/distance.utils';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private orsMapService: OrsMapService,
    private configService: ConfigService,
  ) {}

  async autocompleteLocation(query: string) {
    return this.orsMapService.getAutocompleteSuggestions(query);
  }

  async updateLiveLocation(driver_id: number, latitude: number, longitude: number): Promise<Location | undefined> {
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Invalid latitude or longitude');
    }
    let location = await this.locationRepository.findOne({ 
      where: { driver: { driver_id } as any }, 
      relations: ['driver'] 
    });
    if (!location) {
      location = this.locationRepository.create({
        driver: {  driver_id } as unknown as User,
        latitude,
        longitude,
        label: Label.CUSTOM,
        address: '',
        is_default: false,
      });
      location.lastUpdate = Date.now();
      const saved = await this.locationRepository.save(location);
      await this.cacheManager.del('all_locations');
      await this.cacheManager.del(`location_${saved.location_id}`);
      return saved;
    } else {
      const now = Date.now();
      const timeSinceLastUpdate = now - (location.lastUpdate || 0);
      const updateInterval = 5000; // Minimum 5 seconds between updates

      if (timeSinceLastUpdate >= updateInterval) {
        location.latitude = latitude;
        location.longitude = longitude;
        location.lastUpdate = now; // Update the timestamp
        const saved = await this.locationRepository.save(location);
        await this.cacheManager.del('all_locations');
        await this.cacheManager.del(`location_${saved.location_id}`);
        return saved;
      } else {
        return undefined;
      }
    }
  }

 async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    const apiKey = this.configService.get('ORS_API_KEY') as string;
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${
      apiKey}&text=${encodeURIComponent(address)}&size=1`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const coordinates = data.features[0].geometry.coordinates;
      return { lat: coordinates[1], lng: coordinates[0] };
    } else {
      throw new NotFoundException(`Address "${address}" not found`);
    }
  }
  
  async create(createLocationDto: CreateLocationDto): Promise<Location> {
    console.warn('Warning: Creating location without user association. Use createForUser instead.');
    
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (createLocationDto.address) {
      try {
        const coords = await this.geocodeAddress(createLocationDto.address);
        latitude = coords.lat;
        longitude = coords.lng;
      } catch (error) {
        throw new Error('Error geocoding the address');
      }
    }

    const location = this.locationRepository.create({
      ...createLocationDto,
      latitude,
      longitude,
    });
    
    const saved = await this.locationRepository.save(location);
    await this.cacheManager.del('all_locations');
    
    return saved;
  }

  // New method: Create location for a specific user
  async createForUser(createLocationDto: CreateLocationDto, userId: number): Promise<Location> {
    // Verify user exists
    const user = await this.userRepository.findOne({ 
      where: { userId: userId } 
    });
    
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    let latitude: number | undefined;
    let longitude: number | undefined;

    // Geocode address if provided
    if (createLocationDto.address && !createLocationDto.latitude && !createLocationDto.longitude) {
      try {
        const coords = await this.geocodeAddress(createLocationDto.address);
        latitude = coords.lat;
        longitude = coords.lng;
      } catch (error) {
        throw new Error('Error geocoding the address');
      }
    } else if (createLocationDto.latitude && createLocationDto.longitude) {
      latitude = createLocationDto.latitude;
      longitude = createLocationDto.longitude;
    }

    // If this is set as default, unset other defaults for this user
    if (createLocationDto.is_default) {
      await this.locationRepository.update(
        { user: { userId: userId } },
        { is_default: false }
      );
    }

    const location = this.locationRepository.create({
      ...createLocationDto,
      latitude,
      longitude,
      user: user,
    });

    const saved = await this.locationRepository.save(location);
    
    // Clear relevant caches
    await this.cacheManager.del('all_locations');
    await this.cacheManager.del(`user_locations_${userId}`);
    
    return saved;
  }

  async findAll(): Promise<Location[]> {
    const cached = await this.cacheManager.get('all_locations');
    if (Array.isArray(cached)) {
      return cached.map((item) => Object.assign(new Location(), item));
    }
    const locations = await this.locationRepository.find();
    await this.cacheManager.set('all_locations', locations);
    return locations;
  }

  async findOne(location_id: number): Promise<Location> {
    const cacheKey = `location_${location_id}`;
    const cached = await this.cacheManager.get<Location>(cacheKey);
    if (cached) return cached;
    const location = await this.locationRepository.findOne({
      where: { location_id },
    });
    if (!location)
      throw new NotFoundException(`Location with id ${location_id} not found`);
    await this.cacheManager.set(cacheKey, location);
    return location;
  }

  async update(
    location_id: number,
    updateLocationDto: UpdateLocationDto,
  ): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { location_id },
    });
    if (!location)
      throw new NotFoundException(`Location with id ${location_id} not found`);
    Object.assign(location, updateLocationDto);
    const updated = await this.locationRepository.save(location);
    await this.cacheManager.del('all_locations');
    await this.cacheManager.del(`location_${location_id}`);
    return updated;
  }

  // New method: Update location with user ownership check
  async updateForUser(
    location_id: number, 
    updateLocationDto: UpdateLocationDto, 
    userId: number
  ): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { location_id },
      relations: ['user']
    });

    if (!location) {
      throw new NotFoundException(`Location with id ${location_id} not found`);
    }

    // Check if user owns this location (or is admin)
    if (location.user && location.user.userId !== userId) {
      throw new ForbiddenException('You can only update your own locations');
    }

    // If setting as default, unset other defaults for this user
    if (updateLocationDto.is_default) {
      await this.locationRepository.update(
        { user: { userId: userId } },
        { is_default: false }
      );
    }

    // Geocode new address if provided
    if (updateLocationDto.address && (!updateLocationDto.latitude || !updateLocationDto.longitude)) {
      try {
        const coords = await this.geocodeAddress(updateLocationDto.address);
        updateLocationDto.latitude = coords.lat;
        updateLocationDto.longitude = coords.lng;
      } catch (error) {
        throw new Error('Error geocoding the updated address');
      }
    }

    Object.assign(location, updateLocationDto);
    const updated = await this.locationRepository.save(location);
    
    // Clear caches
    await this.cacheManager.del('all_locations');
    await this.cacheManager.del(`location_${location_id}`);
    await this.cacheManager.del(`user_locations_${userId}`);
    
    return updated;
  }

  async remove(id: number): Promise<string> {
    const result = await this.locationRepository.delete(id);
    await this.cacheManager.del('all_locations');
    await this.cacheManager.del(`location_${id}`);
    if (result.affected === 0) {
      return `Location with id ${id} not found`;
    }
    return `Location with id ${id} deleted successfully`;
  }

  // New method: Remove location with user ownership check
  async removeForUser(location_id: number, userId: number): Promise<string> {
    const location = await this.locationRepository.findOne({
      where: { location_id },
      relations: ['user']
    });

    if (!location) {
      throw new NotFoundException(`Location with id ${location_id} not found`);
    }

    // Check if user owns this location
    if (location.user && location.user.userId !== userId) {
      throw new ForbiddenException('You can only delete your own locations');
    }

    const result = await this.locationRepository.delete(location_id);
    
    // Clear caches
    await this.cacheManager.del('all_locations');
    await this.cacheManager.del(`location_${location_id}`);
    await this.cacheManager.del(`user_locations_${userId}`);

    if (result.affected === 0) {
      return `Location with id ${location_id} not found`;
    }
    
    return `Location with id ${location_id} deleted successfully`;
  }

  async getAvailableDriversWithLocation(): Promise<Array<{
    driver_id: number;
    latitude: number;
    longitude: number;
    lastUpdate: number;
    isAvailable: boolean;
  }>> {
    try {
      // First, try to get drivers from Location entities
      const locationQuery = this.locationRepository
        .createQueryBuilder('location')
        .leftJoin('location.driver', 'driver')
        .select([
          'driver.driver_id as driver_id',
          'location.latitude as latitude',
          'location.longitude as longitude',
          'location.lastUpdate as lastUpdate',
          'driver.isAvailable as isAvailable',
        ])
        .where('driver.isAvailable = :isAvailable', { isAvailable: true })
        .andWhere('location.lastUpdate > :minTime', { 
          minTime: Date.now() - 5 * 60 * 1000 // Last update within 5 minutes
        });

      const locationDrivers = await locationQuery.getRawMany();

      if (locationDrivers.length === 0) {
        const driverQuery = this.locationRepository.manager
          .createQueryBuilder(Driver, 'driver')
          .select([
            'driver.driver_id as driver_id',
            'driver.latitude as latitude',
            'driver.longitude as longitude',
            'EXTRACT(EPOCH FROM NOW()) * 1000 as lastUpdate',
            'driver.isAvailable as isAvailable',
          ])
          .where('driver.isAvailable = :isAvailable', { isAvailable: true })
          .andWhere('driver.latitude IS NOT NULL')
          .andWhere('driver.longitude IS NOT NULL');

        return await driverQuery.getRawMany();
      }

      return locationDrivers;
    } catch (error) {
      console.error('Error in getAvailableDriversWithLocation:', error);
      return [];
    }
  }

  async findNearestDrivers(
    targetLat: number,
    targetLon: number,
    maxRadiusKm: number = 5,
    maxResults: number = 10
  ): Promise<Array<{
    driver_id: number;
    latitude: number;
    longitude: number;
    distance: number;
    lastUpdate: number;
  }>> {
    const availableDrivers = await this.getAvailableDriversWithLocation();
    
    const nearestDrivers = findNearestLocations(
      targetLat,
      targetLon,
      availableDrivers,
      maxRadiusKm
    );

    return nearestDrivers
      .slice(0, maxResults)
      .map(driver => ({
        driver_id: driver.driver_id,
        latitude: driver.latitude,
        longitude: driver.longitude,
        distance: driver.distance,
        lastUpdate: driver.lastUpdate,
      }));
  }

  async calculateDistanceToBooking(
    driver_id: number,
    bookingLat: number,
    bookingLon: number
  ): Promise<number | null> {
    const driverLocation = await this.locationRepository.findOne({
      where: { user: { userId: driver_id } as any },
      relations: ['user']
    });

    if (!driverLocation) {
      return null;
    }

    return calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      bookingLat,
      bookingLon
    );
  }

  async findByUserId(userId: number): Promise<Location[]> {
    const cacheKey = `user_locations_${userId}`;
    const cached = await this.cacheManager.get<Location[]>(cacheKey);
    
    if (cached) {
      return cached.map((item) => Object.assign(new Location(), item));
    }

    const locations = await this.locationRepository.find({
      where: { user: { userId: userId } },
      relations: ['user'],
      order: { 
        is_default: 'DESC', // Default locations first
        location_id: 'ASC' 
      }
    });

    if (locations.length === 0) {
      throw new NotFoundException(`No locations found for user with id ${userId}`);
    }

    // Cache the results for 5 minutes
    await this.cacheManager.set(cacheKey, locations, 300);
    
    return locations;
  }

  async findByCurrentUser(userId: number): Promise<Location[]> {
    return this.findByUserId(userId);
  }

  async findByUserIdWithFilters(
    userId: number, 
    label?: Label, 
    defaultOnly?: boolean
  ): Promise<Location[]> {
    const queryBuilder = this.locationRepository
      .createQueryBuilder('location')
      .leftJoinAndSelect('location.user', 'user')
      .where('user.userId = :userId', { userId });

    if (label) {
      queryBuilder.andWhere('location.label = :label', { label });
    }

    if (defaultOnly) {
      queryBuilder.andWhere('location.is_default = :isDefault', { isDefault: true });
    }

    queryBuilder.orderBy('location.is_default', 'DESC')
               .addOrderBy('location.location_id', 'ASC');

    return queryBuilder.getMany();
  }

  // Enhanced method: Get user's default location
  async getUserDefaultLocation(userId: number): Promise<Location | null> {
    const cacheKey = `user_default_location_${userId}`;
    const cached = await this.cacheManager.get<Location>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const location = await this.locationRepository.findOne({
      where: { 
        user: { userId: userId },
        is_default: true 
      },
      relations: ['user']
    });

    if (location) {
      await this.cacheManager.set(cacheKey, location, 300); // 5 minutes cache
    }

    return location;
  }

  // Enhanced method: Get locations by label for user
  async getUserLocationsByLabel(userId: number, label: Label): Promise<Location[]> {
    return this.locationRepository.find({
      where: { 
        user: { userId: userId },
        label: label 
      },
      relations: ['user'],
      order: { is_default: 'DESC', location_id: 'ASC' }
    });
  }
}