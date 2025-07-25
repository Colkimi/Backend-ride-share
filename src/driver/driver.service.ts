import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from './entities/driver.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { LocationService } from 'src/location/location.service';
import { OrsMapService } from 'src/External-apis/ors-maps';
import { DriverPickupProgressDto, PickupConfirmationDto } from './dto/driver-pickup-progress.dto';
import { Booking, Status } from 'src/bookings/entities/booking.entity';
import { Review } from 'src/review/entities/review.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver) private driverRepository: Repository<Driver>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(Booking) private bookingRepository: Repository<Booking>,
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private locationService: LocationService,
    private orsMapService: OrsMapService,
  ) {}

  async create(createDriverDto: CreateDriverDto): Promise<Driver> {
    // Validate that the user exists before creating a driver
    const user = await this.userRepository.findOne({
      where: { userId: createDriverDto.userId },
    });
    
    if (!user) {
      throw new BadRequestException(`User with ID ${createDriverDto.userId} not found. Cannot create driver for non-existent user.`);
    }

    // Check if driver already exists for this user
    const existingDriver = await this.driverRepository.findOne({
      where: { userId: createDriverDto.userId },
    });
    
    if (existingDriver) {
      throw new BadRequestException(`Driver already exists for user ID ${createDriverDto.userId}`);
    }

    const driver = this.driverRepository.create(createDriverDto);
    const saved = await this.driverRepository.save(driver);
    await this.cacheManager.del('all_drivers');
    return saved;
  }

  async findAll(): Promise<Driver[]> {
    const cached = await this.cacheManager.get<Driver[]>('all_drivers');
    if (cached) return cached;
    const drivers = await this.driverRepository.find();
    await this.cacheManager.set('all_drivers', drivers);
    return drivers;
  }

  async findOne(driver_id: number): Promise<Driver> {
    const cacheKey = `driver_${driver_id}`;
    const cached = await this.cacheManager.get<Driver>(cacheKey);
    if (cached) return cached;
    const driver = await this.driverRepository.findOne({
      where: { driver_id },
    });
    if (!driver)
      throw new NotFoundException(`Driver with id ${driver_id} not found`);
    await this.cacheManager.set(cacheKey, driver);
    return driver;
  }

  async findByUserId(userId: number): Promise<Driver | null> {
    const cacheKey = `driver_by_user_${userId}`;
    const cached = await this.cacheManager.get<Driver>(cacheKey);
    if (cached) return cached;
    
    const driver = await this.driverRepository.findOne({
      where: { userId },
      relations: ['user', 'vehicles'],
    });
    
    if (driver) {
      await this.cacheManager.set(cacheKey, driver);
    }
    
    return driver;
  }
  async findByUserIdEnhanced(
  userId: number, 
  relations: string[] = ['vehicles']
): Promise<Driver | null> {
  const cacheKey = `driver_by_user_${userId}_${relations.join(',')}`;
  const cached = await this.cacheManager.get<Driver>(cacheKey);
  if (cached) return cached;
  
  try {
    const driver = await this.driverRepository.findOne({
      where: { userId },
      relations: [...relations]
    });
    
    if (driver) {
      await this.cacheManager.set(cacheKey, driver, 60 * 5); // 5 minute cache
    }
    
    return driver;
  } catch (error) {
    console.error(`Error finding driver by user ID ${userId}:`, error);
    throw error;
  }
}

async getDriverStats(driverId: number): Promise<any> {
  try {
    const completedTrips = await this.bookingRepository.count({
      where: {
        driver: { driver_id: driverId },
        status: Status.Completed
      }
    });
    
    const ratingsResult = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .where('review.driver_id = :driverId', { driverId })
      .getRawOne();
    
    return {
      completedTrips,
      averageRating: ratingsResult?.averageRating || 0,
      documentsVerified: true, 
    };
  } catch (error) {
    console.error(`Error getting stats for driver ${driverId}:`, error);
    return {
      completedTrips: 0,
      averageRating: 0,
      recentEarnings: 0,
      totalEarnings: 0,
      documentsVerified: false
    };
  }
}

  async update(
    driver_id: number,
    updateDriverDto: UpdateDriverDto,
  ): Promise<Driver> {
    const driver = await this.driverRepository.findOne({
      where: { driver_id },
    });
    if (!driver)
      throw new NotFoundException(`Driver with id ${driver_id} not found`);
    Object.assign(driver, updateDriverDto);
    const updated = await this.driverRepository.save(driver);
    await this.cacheManager.del('all_drivers');
    await this.cacheManager.del(`driver_${driver_id}`);
    return updated;
  }

  async remove(id: number): Promise<string> {
    const result = await this.driverRepository.delete(id);
    await this.cacheManager.del('all_drivers');
    await this.cacheManager.del(`driver_${id}`);
    if (result.affected === 0) {
      return `Driver with id ${id} not found`;
    }
    return `Driver with id ${id} deleted successfully`;
  }

  async getDriverPickupProgress(
    driverId: number,
    bookingId: number,
    pickupLat: number,
    pickupLng: number
  ): Promise<DriverPickupProgressDto> {
    const driverLocation = await this.locationService.calculateDistanceToBooking(
      driverId,
      pickupLat,
      pickupLng
    );

    if (!driverLocation) {
      throw new NotFoundException(`Driver location not found for driver ${driverId}`);
    }

    // Get actual driver location from location service
    const driverCurrentLocation = await this.locationService.findNearestDrivers(
      pickupLat,
      pickupLng,
      50, // Large radius to find the driver
      1
    );

    if (!driverCurrentLocation || driverCurrentLocation.length === 0) {
      throw new NotFoundException(`Driver current location not found for driver ${driverId}`);
    }

    const driverData = driverCurrentLocation[0];
    
    const routeData = await this.orsMapService.getRouteWithInstructions(
      driverData.latitude,
      driverData.longitude,
      pickupLat,
      pickupLng
    );

    const averageSpeedKph = 30;
    const estimatedTimeMultiplier = 1.2;
    const estimatedTimeToPickup = Math.round(
      (driverData.distance / 1000 / averageSpeedKph) * 60 * estimatedTimeMultiplier
    );

    let status: 'en_route' | 'approaching' | 'arrived' | 'waiting' = 'en_route';
    
    if (driverData.distance <= 100) {
      status = 'arrived';
    } else if (driverData.distance <= 500) {
      status = 'approaching';
    }

    return {
      bookingId,
      driverId,
      currentLatitude: driverData.latitude,
      currentLongitude: driverData.longitude,
      distanceToPickup: driverData.distance,
      estimatedTimeToPickup,
      status,
      lastUpdate: new Date().toISOString(),
      routeInstructions: routeData.formattedInstructions.join('; ')
    };
  }

  async confirmPickup(pickupConfirmation: PickupConfirmationDto): Promise<boolean> {
    const driver = await this.driverRepository.findOne({
      where: { driver_id: pickupConfirmation.driverId }
    });

    if (!driver) {
      throw new NotFoundException(`Driver with id ${pickupConfirmation.driverId} not found`);
    }

    // Find the booking to update
    const booking = await this.bookingRepository.findOne({
      where: { 
        id: pickupConfirmation.bookingId,
        driver: { driver_id: pickupConfirmation.driverId }
      }
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${pickupConfirmation.bookingId} not found or not assigned to this driver`);
    }

    // Validate booking status
    if (booking.status !== Status.Accepted) {
      throw new BadRequestException(`Cannot confirm pickup for booking with status: ${booking.status}. Only accepted bookings can be confirmed.`);
    }

    // Update booking status to in_progress
    booking.status = Status.In_progress;
    await this.bookingRepository.save(booking);

    // Update driver availability after pickup
    driver.isAvailable = true;
    await this.driverRepository.save(driver);

    // Clear cache
    await this.cacheManager.del(`driver_${pickupConfirmation.driverId}`);
    await this.cacheManager.del('all_drivers');
    await this.cacheManager.del(`booking_${pickupConfirmation.bookingId}`);

    return true;
  }

  async updateDriverETA(
    driverId: number,
    bookingId: number,
    pickupLat: number,
    pickupLng: number
  ) {
    const progress = await this.getDriverPickupProgress(driverId, bookingId, pickupLat, pickupLng);
    
    return {
      bookingId,
      driverId,
      etaMinutes: progress.estimatedTimeToPickup,
      distanceMeters: progress.distanceToPickup,
      status: progress.status
    };
  }

  async getDriverBookings(userId: number): Promise<Booking[]> {
    const driver = await this.driverRepository.findOne({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with user ID ${userId} not found`);
    }

    return this.bookingRepository.find({
      where: { driver: { driver_id: driver.driver_id } },
      relations: ['user', 'vehicle', 'pricing', 'discount'],
      order: { pickup_time: 'DESC' },
    });
  }

  async getPendingBookingsForDriver(userId: number): Promise<Booking[]> {
    const driver = await this.driverRepository.findOne({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with user ID ${userId} not found`);
    }

    return this.bookingRepository.find({
      where: { 
        driver: { driver_id: driver.driver_id },
        status: Status.Requested 
      },
      relations: ['user', 'vehicle', 'pricing', 'discount'],
      order: { pickup_time: 'ASC' },
    });
  }

  async acceptBooking(userId: number, bookingId: number): Promise<Booking> {
  const driver = await this.driverRepository.findOne({
    where: { userId },
  });

  if (!driver) {
    throw new NotFoundException(`Driver with user ID ${userId} not found`);
  }

  if (!driver.isAvailable) {
    throw new BadRequestException('Driver is not available to accept bookings');
  }

  const booking = await this.bookingRepository.findOne({
    where: { id: bookingId },
    relations: ['driver', 'user'],
  });

  if (!booking) {
    throw new NotFoundException(`Booking with id ${bookingId} not found`);
  }

  // FIX: Check if booking is in requested status
  if (booking.status !== Status.Requested) {
    throw new BadRequestException(`Cannot accept booking with status: ${booking.status}. Only requested bookings can be accepted.`);
  }

  // FIX: Check if booking is already assigned to another driver
  if (booking.driver && booking.driver.driver_id !== driver.driver_id) {
    throw new ForbiddenException('This booking is already assigned to another driver');
  }

  // Assign driver to booking
  booking.driver = driver;
  booking.status = Status.Accepted;
  
  // Make driver unavailable
  driver.isAvailable = false;
  await this.driverRepository.save(driver);

  const updatedBooking = await this.bookingRepository.save(booking);

  // Clear cache
  await this.cacheManager.del('all_bookings');
  await this.cacheManager.del(`booking_${bookingId}`);

  return updatedBooking;
}

async rejectBooking(driverId: number, bookingId: number): Promise<Booking> {
  const driver = await this.driverRepository.findOne({
    where: { driver_id: driverId },
  });

  if (!driver) {
    throw new NotFoundException(`Driver with id ${driverId} not found`);
  }

  const booking = await this.bookingRepository.findOne({
    where: { id: bookingId },
    relations: ['driver', 'user'],
  });

  if (!booking) {
    throw new NotFoundException(`Booking with id ${bookingId} not found`);
  }

  if (![Status.Requested, Status.Accepted].includes(booking.status as Status)) {
    throw new BadRequestException(`Cannot reject booking with status: ${booking.status}`);
  }

  if (booking.status === Status.Accepted && (!booking.driver || booking.driver.driver_id !== driverId)) {
    throw new ForbiddenException('This booking is not assigned to you');
  }

  await this.bookingRepository.update(
    { id: bookingId },
    { 
      driver: undefined,
      status: Status.RejectedByDriver 
    }
  );

  if (!driver.isAvailable) {
    driver.isAvailable = true;
    await this.driverRepository.save(driver);
  }

  const updatedBooking = await this.bookingRepository.findOne({
    where: { id: bookingId },
    relations: ['user', 'vehicle', 'pricing', 'discount'],
  });

  await this.cacheManager.del('all_bookings');
  await this.cacheManager.del(`booking_${bookingId}`);

  return updatedBooking!;
}

async rejectBookingWithReassignment(driverId: number, bookingId: number): Promise<{
  success: boolean;
  reassigned?: boolean;
  newDriverId?: number;
  booking?: Booking;
}> {
  const driver = await this.driverRepository.findOne({
    where: { driver_id: driverId },
  });

  if (!driver) {
    throw new NotFoundException(`Driver with id ${driverId} not found`);
  }

  const booking = await this.bookingRepository.findOne({
    where: { id: bookingId },
    relations: ['driver', 'user'],
  });

  if (!booking) {
    throw new NotFoundException(`Booking with id ${bookingId} not found`);
  }

  if (!booking.driver || booking.driver.driver_id !== driverId) {
    throw new ForbiddenException('This booking is not assigned to this driver');
  }

  if (![Status.Requested, Status.Accepted].includes(booking.status as Status)) {
    throw new BadRequestException(`Cannot reject booking with status: ${booking.status}`);
  }

  // Make rejecting driver available
  driver.isAvailable = true;
  await this.driverRepository.save(driver);

  await this.bookingRepository.update(
    { id: bookingId },
    { 
      driver: undefined,
      status: Status.Requested 
    }
  );

  await this.cacheManager.del('all_bookings');
  await this.cacheManager.del(`booking_${bookingId}`);

  try {
    const freshBooking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['user'],
    });

    if (!freshBooking) {
      throw new Error('Booking not found after update');
    }

    const availableDrivers = await this.findAvailableDriversForBooking(freshBooking, driverId);
    
    console.log(`Found ${availableDrivers.length} available drivers (excluding driver ${driverId})`);
    
    if (availableDrivers.length > 0) {
      const newDriver = availableDrivers[0];
      
      if (newDriver.driver_id === driverId) {
        console.warn(`Attempted to reassign booking ${bookingId} to the same driver ${driverId} who rejected it!`);
        throw new Error('Cannot reassign to the same driver who rejected');
      }
      
      await this.bookingRepository.update(
        { id: bookingId },
        { 
          driver: { driver_id: newDriver.driver_id },
          status: Status.Accepted 
        }
      );

      newDriver.isAvailable = false;
      await this.driverRepository.save(newDriver);
      
      const updatedBooking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ['driver', 'user', 'vehicle', 'pricing', 'discount'],
      });
      
      console.log(`Successfully reassigned booking ${bookingId} from driver ${driverId} to driver ${newDriver.driver_id}`);
      
      return {
        success: true,
        reassigned: true,
        newDriverId: newDriver.driver_id,
        booking: updatedBooking!,
      };
    }
  } catch (error) {
    console.error('Failed to reassign booking:', error);
  }

  const finalBooking = await this.bookingRepository.findOne({
    where: { id: bookingId },
    relations: ['user', 'vehicle', 'pricing', 'discount'],
  });

  console.log(`No available drivers found for reassignment of booking ${bookingId}`);

  return {
    success: true,
    reassigned: false,
    booking: finalBooking!,
  };
}

  private async findAvailableDriversForBooking(booking: Booking, excludeDriverId?: number): Promise<Driver[]> {
    console.log(`Finding available drivers for booking ${booking.id}, excluding driver ${excludeDriverId}`);
    
    let query = this.driverRepository
      .createQueryBuilder('driver')
      .where('driver.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('driver.latitude IS NOT NULL')
      .andWhere('driver.longitude IS NOT NULL');

    if (excludeDriverId) {
      query = query.andWhere('driver.driver_id != :excludeDriverId', { excludeDriverId });
    }

    const drivers = await query.getMany();
    
    console.log(`Found ${drivers.length} potentially available drivers`);

    const nearbyDrivers = drivers.filter(driver => {
      if (excludeDriverId && driver.driver_id === excludeDriverId) {
        console.warn(`Driver ${driver.driver_id} should have been excluded by query but wasn't!`);
        return false;
      }
      
      const distance = this.calculateDistance(
        booking.start_latitude,
        booking.start_longitude,
        driver.latitude,
        driver.longitude
      );
      
      const isNearby = distance <= 5000; // 5km radius
      
      console.log(`Driver ${driver.driver_id}: distance=${distance}m, nearby=${isNearby}`);
      
      return isNearby;
    });

    nearbyDrivers.sort((a, b) => {
      const distanceA = this.calculateDistance(
        booking.start_latitude,
        booking.start_longitude,
        a.latitude,
        a.longitude
      );
      const distanceB = this.calculateDistance(
        booking.start_latitude,
        booking.start_longitude,
        b.latitude,
        b.longitude
      );
      return distanceA - distanceB;
    });

    console.log(`Final nearby drivers: ${nearbyDrivers.map(d => d.driver_id).join(', ')}`);

    return nearbyDrivers;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  async getBookingDetailsForDriver(driverId: number, bookingId: number): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { 
        id: bookingId,
        driver: { driver_id: driverId }
      },
      relations: ['user', 'vehicle', 'pricing', 'discount', 'driver'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${bookingId} not found or not assigned to this driver`);
    }

    return booking;
  }

  async findAvailableDrivers(): Promise<Driver[]> {
    const cacheKey = 'available_drivers';
    const cached = await this.cacheManager.get<Driver[]>(cacheKey);
    if (cached) return cached;

    const drivers = await this.driverRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .leftJoinAndSelect('driver.vehicles', 'vehicles')
      .where('driver.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('driver.verification_status = :status', { status: 'verified' })
      .orderBy('driver.rating', 'DESC')
      .addOrderBy('driver.driver_id', 'DESC')
      .getMany();

    await this.cacheManager.set(cacheKey, drivers, 120000);
    
    return drivers;
  }
}
