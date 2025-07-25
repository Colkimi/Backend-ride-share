import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, Status } from './entities/booking.entity';
import { Not, Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { OrsMapService } from '../External-apis/ors-maps';
import { Pricing } from 'src/pricing/entities/pricing.entity';
import { Discount } from 'src/discount/entities/discount.entity';
import { EmailService } from 'src/notifications/email/email.service';
import { SmsService } from 'src/notifications/sms/sms.service';
import { jwtDecode } from 'jwt-decode';
import { JWTPayload } from 'src/auth/strategies';
import { User } from 'src/users/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { Role } from 'src/users/entities/user.entity';
import { LocationService } from 'src/location/location.service';
import { DriverMatchResponseDto } from './dto/match-driver.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private userRepository: Repository<User>, 
    @InjectRepository(Pricing)
    private pricingRepository: Repository<Pricing>,
    @InjectRepository(Discount)
    private discountRepository: Repository<Discount>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private orsMapService: OrsMapService,
    private emailService: EmailService,
    private smsService: SmsService,
    private locationService: LocationService,
  ) {}

  async autocompleteLocation(query: string) {
    return this.orsMapService.getAutocompleteSuggestions(query);
  }

  async getRoute(startLat: number, startLng: number, endLat: number, endLng: number) {
  try {
    console.log('getRoute input:', { startLat, startLng, endLat, endLng });

    const start = `${startLng},${startLat}`;
    const end = `${endLng},${endLat}`;

    console.log('Calling OrsMapService with:', { start, end });

    const routeInfo = await this.orsMapService.getRouteInfo(start, end);

    console.log('Route info received:', routeInfo);

    if (!routeInfo || typeof routeInfo.distance !== 'number' || typeof routeInfo.duration !== 'number') {
      throw new Error('Invalid route information received');
    }

    return {
      distance: routeInfo.distance,
      duration: routeInfo.duration,
      geometry: routeInfo.geometry
    };
  } catch (error) {
    console.error('Error in getRoute:', error);
    throw new Error('Failed to fetch route information: ' + error.message);
  }
}

  async create(createBookingDto: CreateBookingDto, accessToken?: string, userId?: number) {
    const {
      start_latitude,
      start_longitude,
      end_latitude,
      end_longitude,
      status,
      pricingId,
      discountId,
      ...rest
    } = createBookingDto;

    let distance = 0;
    let duration = 0;
    try {
      const routeInfo = await this.getRoute(
        start_latitude,
        start_longitude,
        end_latitude,
        end_longitude,
      );
      distance = routeInfo.distance;
      duration = routeInfo.duration;
    } catch (error) {
      console.error('Error fetching route info:', error.message);
      throw new Error(
        'Failed to fetch route information. Please check the coordinates and try again.',
      );
    }

    let baseFare = 50,
      perKmRate = 5,
      perMinuteRate = 2,
      surgeMultiplier = 1;
    let pricingEntity: Pricing | undefined = undefined;
    if (pricingId) {
      const pricing = await this.pricingRepository.findOne({
        where: { id: pricingId },
      });
      if (pricing) {
        baseFare = pricing.basefare;
        perKmRate = pricing.cost_per_km;
        perMinuteRate = pricing.cost_per_minute;
        surgeMultiplier = pricing.conditions_multiplier || 1;
        pricingEntity = pricing;
      }
    }

    const distanceInKm = distance / 1000;
    const durationInMin = duration / 60;
    let fare =
      (baseFare + perKmRate * distanceInKm + perMinuteRate * durationInMin) *
      surgeMultiplier;
    if (pricingEntity) {
      fare += pricingEntity.service_fee;
    }

    let discountEntity: Discount | undefined = undefined;
    if (discountId) {
      const discount = await this.discountRepository.findOne({
        where: { id: discountId },
      });
      if (
        discount &&
        discount.expiry_date > new Date() &&
        discount.maximum_uses > discount.current_uses
      ) {
        discountEntity = discount;
        if (discount.discount_type === 'percentage') {
          fare = fare - (fare * discount.discount_value) / 100;
        } else if (discount.discount_type === 'fixed') {
          fare = fare - discount.discount_value;
        }
        if (pricingEntity && fare < pricingEntity.minimum_fare) {
          fare = pricingEntity.minimum_fare;
        }
        if (fare < 0) fare = 0;
      }
    }

    fare = Math.max(Math.ceil(fare), 0);

      console.log('Calculated values before saving booking:', {
       distance,
       duration,
       fare,
     });
     if (
      fare ===null ||
      fare === undefined ||
      isNaN(fare) ||
      distance === null ||
      distance === undefined ||
      isNaN(distance) ||
      duration === null ||
      duration === undefined ||
      isNaN(duration)
     ){
     console.error('Invalid booking values:', { fare, distance, duration });
    throw new Error(
      `Invalid booking values: fare=${fare}, distance=${distance}, duration=${duration}`,
    );
    }

    if (discountEntity) {
      discountEntity.current_uses += 1;
      await this.discountRepository.save(discountEntity);
    }

    let userEntity: User | undefined;
    
    if (userId) {
      const foundUser = await this.userRepository.findOne({
        where: { userId }
      });
      userEntity = foundUser === null ? undefined : foundUser;
      
      if (!userEntity) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }
    } else if (accessToken) {
      try {
        const decoded = jwtDecode<JWTPayload>(accessToken);
        const foundUser = await this.userRepository.findOne({
          where: { email: decoded.email }
        });
        userEntity = foundUser === null ? undefined : foundUser;
      } catch (error) {
        console.error('Error decoding access token or finding user:', error);
      }
    }

    if (!userEntity) {
      throw new BadRequestException('User not found or not authenticated');
    }

    const newBooking = this.bookingRepository.create({
      start_latitude,
      start_longitude,
      end_latitude,
      end_longitude,
       pickup_time: rest.pickup_time,
      dropoff_time: rest.dropoff_time,
      status: status || Status.Requested,
      distance: distance,
      duration: duration,
      fare: fare,
      pricing: pricingEntity,
      discount: discountEntity,
      user: userEntity, // Add the user relationship
    });
    console.log('New booking to be saved:', JSON.stringify(newBooking, null, 2));
    try {
    const savedBooking = await this.bookingRepository.save(newBooking);
    console.log('Booking saved successfully:', JSON.stringify(savedBooking, null, 2));

    let emailToUse: string | undefined;

    if (accessToken) {
      try {
      const decoded = jwtDecode<JWTPayload>(accessToken);
        emailToUse = decoded.email;
      } catch (decodeError) {
        console.error('Error decoding access token:', decodeError);
      }
    }

    if (!emailToUse) {
      const bookingWithUser = await this.bookingRepository.findOne({
        where: { id: savedBooking.id },
        relations: ['user'],
      });

      if (bookingWithUser && bookingWithUser.user && bookingWithUser.user.email) {
        emailToUse = bookingWithUser.user.email;
      } else {
        console.warn('No user email found in booking relation, skipping email notification');
      }
    }

    console.log('Sending booking notification email to:', emailToUse);

    if (emailToUse) {
      try {
        await this.emailService.sendBookingNotification(emailToUse, savedBooking);
        console.log('Booking notification email sent successfully');
      } catch (emailError) {
        console.error('Error sending booking notification email:', emailError);
      }
    } else {
      console.error('No user email found for booking, skipping email notification');
    }

    try {
         const bookingWithUser = await this.bookingRepository.findOne({
        where: { id: savedBooking.id },
        relations: ['user'],
      });
      if (bookingWithUser && bookingWithUser.user && bookingWithUser.user.email) {
        emailToUse = bookingWithUser.user.email;
      }
      const user = await this.userRepository.findOne({
        where: { email: emailToUse },
      });
    //   if(user){
    //   const customerName = user.firstName || '';
    //   const phone = user.phone;
    //   const driverName = savedBooking.driver ? 'Your driver' : '';
    //   const pickupAddress = await this.orsMapService.getPlaceName(savedBooking.start_latitude, savedBooking.start_longitude);
    //   const destinationAddress = await this.orsMapService.getPlaceName(savedBooking.end_latitude, savedBooking.end_longitude);
    //   if(pickupAddress && destinationAddress){
    //     await this.smsService.sendBookingConfirmation(
    //       phone,
    //       customerName,
    //       driverName,
    //       pickupAddress,
    //       destinationAddress,
    //     );
      
    //     console.log('Booking confirmation SMS sent successfully');
    //   }
    //   else {
    //     console.error('Failed to get place name for booking, skipping SMS notification', error);
    //   }
    //   }
    //  else {
    //     console.error('No user phone number found for booking, skipping SMS notification');
    //   }
    } catch (smsError) {
      console.error('Error sending booking confirmation SMS:', smsError);
    }

    return savedBooking;
  } catch (error) {
    console.error('Error saving booking:', error);
    throw new Error('Failed to save booking: ' + error.message);
  }
  }

  async findAll() {
    const cached = await this.cacheManager.get<Booking[]>('all_bookings');
    if (cached) {
      return cached;
    }
    const bookings = await this.bookingRepository.find();
    await this.cacheManager.set('all_bookings', bookings);
    return bookings;
  }

  async findUserBookings(userId: number) {
    const cacheKey = `user_bookings_${userId}`;
    const cached = await this.cacheManager.get<Booking[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const bookings = await this.bookingRepository.find({
      where: { user: { userId } },
      relations: ['user', 'driver', 'vehicle', 'paymentMethod', 'review'],
      order: { pickup_time: 'DESC' }
    });

    await this.cacheManager.set(cacheKey, bookings);
    return bookings;
  }

  async findDriverBookings(driverId: number) {
    const cacheKey = `driver_bookings_${driverId}`;
    const cached = await this.cacheManager.get<Booking[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const bookings = await this.bookingRepository.find({
      where: { 
        driver: { driver_id: driverId },
        status: Not(Status.Requested) // Drivers can only see assigned bookings
      },
      relations: ['user', 'driver', 'vehicle', 'paymentMethod', 'review'],
      order: { pickup_time: 'DESC' }
    });

    await this.cacheManager.set(cacheKey, bookings);
    return bookings;
  }

  async findFilteredBookings(userId: number, role: Role, driverId?: number) {
    if (role === Role.ADMIN) {
      return this.findAll();
    }
    
    if (role === Role.CUSTOMER) {
      return this.findUserBookings(userId);
    }
    
    if (role === Role.DRIVER && driverId) {
      return this.findDriverBookings(driverId);
    }
    
    throw new Error('Invalid role or missing driver ID');
  }

  async getDriverByUserId(userId: number): Promise<Driver | null> {
    return this.driverRepository.findOne({
      where: { user: { userId } },
      relations: ['user']
    });
  }

  async canUserAccessBooking(bookingId: number, userId: number, role: Role): Promise<boolean> {
    const booking = await this.findOne(bookingId);
    
    if (!booking) {
      return false;
    }
    
    if (role === Role.ADMIN) {
      return true;
    }
    
    if (role === Role.CUSTOMER) {
      return booking.user?.userId === userId;
    }
    
    if (role === Role.DRIVER) {
      const driver = await this.getDriverByUserId(userId);
      return driver ? booking.driver?.driver_id === driver.driver_id : false;
    }
    
    return false;
  }

  async findOne(id: number) {
    const cacheKey = `booking_${id}`;
    const cached = await this.cacheManager.get<Booking>(cacheKey);
    if (cached) {
      return cached;
    }
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });
    if (booking) {
      await this.cacheManager.set(cacheKey, booking);
    }
    return booking;
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['driver'],
    });
    if (!booking) {
      throw new NotFoundException(`booking with id ${id} not found`);
    }

    const {
      start_latitude,
      start_longitude,
      end_latitude,
      end_longitude,
      pickup_time,
      dropoff_time,
      distance,
      duration,
      fare,
      status,
      ...rest
    } = updateBookingDto;

    if (start_latitude !== undefined) booking.start_latitude = start_latitude;
    if (start_longitude !== undefined)
      booking.start_longitude = start_longitude;
    if (end_latitude !== undefined) booking.end_latitude = end_latitude;
    if (end_longitude !== undefined) booking.end_longitude = end_longitude;
    if (pickup_time !== undefined) booking.pickup_time = pickup_time;
    if (dropoff_time !== undefined) booking.dropoff_time = dropoff_time;
    if (distance !== undefined) booking.distance = distance;
    if (duration !== undefined) booking.duration = duration;
    if (fare !== undefined) booking.fare = fare;
    
    // Handle status changes and driver availability
    if (status !== undefined) {
      const oldStatus = booking.status;
      booking.status = status;

      // When booking is completed, make driver available again
      if (status === Status.Completed && booking.driver) {
        const driver = await this.driverRepository.findOne({
          where: { driver_id: booking.driver.driver_id },
        });
        if (driver) {
          driver.isAvailable = true;
          await this.driverRepository.save(driver);
        }
      }

      // When booking is cancelled, make driver available again
      if ((status === Status.Cancelled) && booking.driver && oldStatus !== Status.Cancelled) {
        const driver = await this.driverRepository.findOne({
          where: { driver_id: booking.driver.driver_id },
        });
        if (driver) {
          driver.isAvailable = true;
          await this.driverRepository.save(driver);
        }
      }
    }

    Object.assign(booking, rest);

    const updatedBooking = await this.bookingRepository.save(booking);

    await this.cacheManager.del('all_bookings');
    await this.cacheManager.del(`booking_${id}`);
    return updatedBooking;
  }

  async remove(id: number): Promise<string> {
    return await this.bookingRepository.delete(id).then((result) => {
      if (result.affected === 0) {
        return `Booking with id ${id} not found`;
      }
      return `Booking with id ${id} deleted successfully`;
    });
  }

  async findNearestDriversForBooking(
    bookingId?: number,
    maxRadiusKm: number = 5,
    maxResults: number = 10
  ): Promise<DriverMatchResponseDto[]> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${bookingId} not found`);
    }

    const nearestDrivers = await this.locationService.findNearestDrivers(
      booking.start_latitude,
      booking.start_longitude,
      maxRadiusKm,
      maxResults
    );

    // Get route instructions from driver to pickup location
    const routeInstructions = await this.orsMapService.getRouteWithInstructions(
      booking.start_latitude,
      booking.start_longitude,
      booking.end_latitude,
      booking.end_longitude
    );

    // Calculate estimated time to pickup (assuming average speed of 30 km/h)
    const averageSpeedKph = 30;
    const estimatedTimeMultiplier = 1.2; // Account for traffic

    return nearestDrivers.map(driver => ({
      driverId: driver.driver_id,
      latitude: driver.latitude,
      longitude: driver.longitude,
      distance: driver.distance,
      lastUpdate: driver.lastUpdate,
      estimatedTimeToPickup: Math.round(
        (driver.distance / averageSpeedKph) * 60 * estimatedTimeMultiplier
      ),
      routeInstructions: routeInstructions.formattedInstructions,
      totalDistance: routeInstructions.distance,
      totalDuration: routeInstructions.duration
    }));
  }

  async assignDriverToBooking(bookingId: number, driverId: number): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['driver', 'user'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${bookingId} not found`);
    }

    const driver = await this.driverRepository.findOne({
      where: { driver_id: driverId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with id ${driverId} not found`);
    }

    if (!driver.isAvailable) {
      throw new Error(`Driver with id ${driverId} is not available`);
    }

    booking.driver = driver;
    // Keep status as requested until driver explicitly accepts or rejects
    booking.status = Status.Requested;
    
    driver.isAvailable = false;
    await this.driverRepository.save(driver);

    const updatedBooking = await this.bookingRepository.save(booking);
    await this.cacheManager.del('all_bookings');
    await this.cacheManager.del(`booking_${bookingId}`);

    // Send notifications
    try {
      if (booking.user?.email) {
        await this.emailService.sendBookingNotification(
          booking.user.email,
          updatedBooking
        );
      }
    } catch (error) {
      console.error('Error sending booking notification:', error);
    }

    return updatedBooking;
  }

  async autoAssignNearestDriver(bookingId: number): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${bookingId} not found`);
    }
   try{

     const availableDrivers = await this.findAvailableDriversWithScore(booking);
     
     if (availableDrivers.length === 0) {
       throw new Error('No available drivers found');
      }
      
      availableDrivers.sort((a, b) => b.score - a.score);
      
      const bestDriver = availableDrivers[0];
      return this.assignDriverToBooking(bookingId, bestDriver.driverId);
    }
    catch(error){
    console.error('Error in auto-assign driver:', error);
  
    if (error.message.includes('routing') || error.message.includes('route')) {
      console.warn('Routing failed, using basic distance for driver assignment');
     const nearestDrivers = await this.locationService.findNearestDrivers(
        booking.start_latitude,
        booking.start_longitude,
        5, 
        1  
      );
      if (nearestDrivers.length > 0) {
        return await this.assignDriverToBooking(bookingId, nearestDrivers[0].driver_id);
      }
    }
    throw Error;
    }
  }

  private async findAvailableDriversWithScore(booking: Booking): Promise<Array<{
    driverId: number;
    score: number;
    distance: number;
    driver: Driver;
  }>> {
    // Progressive radius expansion: 5km → 10km → 15km → 25km
    const radiusSteps = [5, 10, 15, 25];
    const maxResults = 20;
    
    console.log('=== DEBUG: Starting findAvailableDriversWithScore ===');
    console.log('Booking location:', booking.start_latitude, booking.start_longitude);
    
    // First, let's check all available drivers without distance filtering
    const allAvailableDrivers = await this.driverRepository
      .createQueryBuilder('driver')
      .where('driver.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('driver.latitude IS NOT NULL')
      .andWhere('driver.longitude IS NOT NULL')
      .getMany();
    
    console.log('All available drivers count:', allAvailableDrivers.length);
    console.log('Available drivers:', allAvailableDrivers.map(d => ({
      id: d.driver_id,
      lat: d.latitude,
      lng: d.longitude,
      available: d.isAvailable,
      verification: d.verification_status
    })));

    // Try progressive radius expansion
    let nearestDrivers: DriverMatchResponseDto[] = [];
    let usedRadius = 5;
    
    for (const radius of radiusSteps) {
      console.log(`Trying radius: ${radius}km`);
      
      nearestDrivers = await this.findNearestDriversForBooking(
        booking.id,
        radius,
        maxResults
      );
      
      console.log(`Found ${nearestDrivers.length} drivers within ${radius}km`);
      
      if (nearestDrivers.length > 0) {
        usedRadius = radius;
        break;
      }
    }

    console.log(`Using radius: ${usedRadius}km, found ${nearestDrivers.length} drivers`);
    console.log('Nearest drivers details:', nearestDrivers);
    const driversWithScores = await Promise.all(
      nearestDrivers.map(async (driverInfo) => {
        const driver = await this.driverRepository.findOne({
          where: { driver_id: driverInfo.driverId },
          relations: ['user'],
        });

        console.log('Processing driver:', driverInfo.driverId, {
          found: !!driver,
          isAvailable: driver?.isAvailable,
          verification: driver?.verification_status,
          distance: driverInfo.distance
        });

        if (!driver || !driver.isAvailable) {
          console.log('Skipping driver due to:', {
            driverExists: !!driver,
            isAvailable: driver?.isAvailable
          });
          return null;
        }

        let score = 0;
        
        const distanceScore = Math.max(0, 100 - (driverInfo.distance / 1000) * 10);
        score += distanceScore * 0.4; // 40% weight
        
        const ratingScore = driver.rating ? driver.rating * 20 : 80;
        score += ratingScore * 0.3; // 30% weight
        
        const availabilityScore = driver.isAvailable ? 100 : 0;
        score += availabilityScore * 0.2; // 20% weight
        
        const vehicleTypeScore = 100; // Placeholder for vehicle type matching
        score += vehicleTypeScore * 0.1; // 10% weight

        console.log('Driver score calculated:', {
          driverId: driver.driver_id,
          score,
          distance: driverInfo.distance,
          rating: driver.rating
        });

        return {
          driverId: driver.driver_id,
          score: Math.round(score),
          distance: driverInfo.distance,
          driver,
        };
      })
    );

    const filteredDrivers = driversWithScores.filter(Boolean) as Array<{
      driverId: number;
      score: number;
      distance: number;
      driver: Driver;
    }>;

    console.log('Final filtered drivers count:', filteredDrivers.length);
    console.log('Final drivers:', filteredDrivers.map(d => ({
      id: d.driverId,
      score: d.score,
      distance: d.distance
    })));

    return filteredDrivers;
  }

  async completeBookingAndUpdateDriverLocation(bookingId: number): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['driver', 'dropoffLocation'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${bookingId} not found`);
    }

    if (booking.status !== Status.In_progress) {
      throw new BadRequestException('Booking is not in progress');
    }

    // Update booking status
    booking.status = Status.Completed;
    booking.dropoff_time = new Date();
    
    // Update driver location to dropoff point
    if (booking.driver.driver_id) {
      await this.updateDriverLocationToDropoff(booking.driver.driver_id, {
        latitude: booking.end_latitude,
        longitude: booking.end_longitude,
      });
      
      // Make driver available again
      booking.driver.isAvailable = true;
      await this.driverRepository.save(booking.driver);
    }

    const updatedBooking = await this.bookingRepository.save(booking);

    // Clear cache
    await this.cacheManager.del('all_bookings');
    await this.cacheManager.del(`booking_${bookingId}`);

    return updatedBooking;
  }

  private async updateDriverLocationToDropoff(driverId: number, location: { latitude: number; longitude: number }): Promise<void> {
    const driver = await this.driverRepository.findOne({
      where: { driver_id: driverId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with id ${driverId} not found`);
    }

    // Update driver location to dropoff point
    driver.latitude = location.latitude;
    driver.longitude = location.longitude;
    
    await this.driverRepository.save(driver);
    
    // Clear cache
    await this.cacheManager.del(`driver_${driverId}`);
    await this.cacheManager.del('all_drivers');
  }

  async getAvailableDriversNearBooking(
    bookingId: number,
    maxRadiusKm: number = 5,
    maxResults: number = 10
  ): Promise<DriverMatchResponseDto[]> {
    return this.findNearestDriversForBooking(bookingId, maxRadiusKm, maxResults);
  }

  async getRouteWithInstructions(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ) {
    return this.orsMapService.getRouteWithInstructions(startLat, startLng, endLat, endLng);
  }

  async completePayment(bookingId: number): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({ 
      where: { id: bookingId },
      relations: ['user', 'driver'] 
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }
    
    // Set status to payment_completed instead of accepted
    booking.status = Status.PaymentCompleted;
    return this.bookingRepository.save(booking);
  }
}
