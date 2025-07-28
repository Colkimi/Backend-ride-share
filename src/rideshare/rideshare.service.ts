import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Rideshare, RideshareStatus, ShareType } from './entities/rideshare.entity';
import { Booking, Status } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { CreateRideshareDto } from './dto/create-rideshare.dto';
import { UpdateRideshareDto } from './dto/update-rideshare.dto';
import { AvailableRideDto } from './dto/available-rides.dto';
import { RideshareResponseDto } from './dto/rideshare-response.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { OrsMapService } from '../External-apis/ors-maps';

@Injectable()
export class RideshareService {
  constructor(
    @InjectRepository(Rideshare)
    private rideshareRepository: Repository<Rideshare>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private orsMapService: OrsMapService,
  ) {}

  async searchAvailableRides(userId: number, searchDto: SearchRidesDto): Promise<AvailableRideDto[]> {
    const pickupTime = new Date(searchDto.pickupTime);
    const timeWindow = searchDto.timeWindow || 30;
    const maxPickupDistance = searchDto.maxPickupDistance || 2;
    const maxRouteDeviation = searchDto.maxRouteDeviation || 5;

    // Use more flexible time window with buffer
    const timeStart = new Date(pickupTime.getTime() - timeWindow * 60000);
    const timeEnd = new Date(pickupTime.getTime() + timeWindow * 60000);

    console.log('🔍 Rideshare Search Debug:', {
      searchingUserId: userId,
      pickupTime: pickupTime.toISOString(),
      timeWindow: `${timeStart.toISOString()} to ${timeEnd.toISOString()}`,
      searchLocation: `${searchDto.pickupLat}, ${searchDto.pickupLng}`,
      targetLocation: `${searchDto.dropoffLat}, ${searchDto.dropoffLng}`,
      maxPickupDistance: `${maxPickupDistance}km`,
      maxRouteDeviation: `${maxRouteDeviation}km`,
      timeWindowMinutes: timeWindow
    });

    // First, let's check ALL bookings to see what's available
    const allRequestedBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .where('booking.status = :status', { status: Status.Requested })
      .getMany();

    console.log('📋 All requested bookings in system:', {
      total: allRequestedBookings.length,
      bookings: allRequestedBookings.map(b => ({
        id: b.id,
        userId: b.user?.userId,
        pickup_time: b.pickup_time,
        location: `${b.start_latitude}, ${b.start_longitude} -> ${b.end_latitude}, ${b.end_longitude}`,
        fare: b.fare
      }))
    });

    // Find available bookings within time window - use more flexible filtering
    const availableBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .where('booking.status = :status', { status: Status.Requested })
      .andWhere('booking.pickup_time >= :timeStart AND booking.pickup_time <= :timeEnd', { timeStart, timeEnd })
      .andWhere('booking.user.userId != :userId', { userId })
      .getMany();

    console.log('📋 Bookings after time and user filtering:', {
      timeFiltered: availableBookings.length,
      excludedUserId: userId,
      bookings: availableBookings.map(b => ({
        id: b.id,
        userId: b.user?.userId,
        pickup_time: b.pickup_time,
        location: `${b.start_latitude}, ${b.start_longitude}`,
        fare: b.fare
      }))
    });

    const availableRides: AvailableRideDto[] = [];

    for (const booking of availableBookings) {
      console.log(`\n🔍 Processing booking ${booking.id}:`);

      // Check if ride already has maximum sharers (max 3 people per ride)
      const existingShares = await this.rideshareRepository.count({
        where: { 
          primaryBooking: { id: booking.id },
          status: RideshareStatus.ACCEPTED 
        }
      });

      console.log(`   👥 Existing shares: ${existingShares}/2`);

      if (existingShares >= 2) {
        console.log(`   ❌ Skipping: Already full (${existingShares} shares)`);
        continue;
      }

      // Calculate distance from user's pickup to ride's pickup
      const pickupDistance = this.calculateDistance(
        searchDto.pickupLat, searchDto.pickupLng,
        booking.start_latitude, booking.start_longitude
      );

      console.log(`   📏 Pickup distance: ${(pickupDistance/1000).toFixed(2)}km (max: ${maxPickupDistance}km)`);

      if (pickupDistance > maxPickupDistance * 1000) {
        console.log(`   ❌ Skipping: Pickup too far (${(pickupDistance/1000).toFixed(2)}km > ${maxPickupDistance}km)`);
        continue;
      }

      // Calculate route similarity
      console.log(`   🗺️ Calculating route match...`);
      const routeMatch = await this.calculateRouteMatch(
        searchDto.pickupLat, searchDto.pickupLng, searchDto.dropoffLat, searchDto.dropoffLng,
        booking.start_latitude, booking.start_longitude,
        booking.end_latitude, booking.end_longitude
      );

      console.log(`   📊 Route match: ${routeMatch.matchPercentage.toFixed(1)}%, deviation: ${(routeMatch.deviation/1000).toFixed(2)}km (max: ${maxRouteDeviation}km)`);

      if (routeMatch.deviation > maxRouteDeviation * 1000) {
        console.log(`   ❌ Skipping: Route deviation too high (${(routeMatch.deviation/1000).toFixed(2)}km > ${maxRouteDeviation}km)`);
        continue;
      }

      // Determine share type
      const shareType = this.determineShareType(
        searchDto.pickupLat, searchDto.pickupLng, searchDto.dropoffLat, searchDto.dropoffLng,
        booking.start_latitude, booking.start_longitude,
        booking.end_latitude, booking.end_longitude
      );

      console.log(`   🎯 Share type: ${shareType}`);

      // Calculate estimated shared fare (typically 60-80% of original fare)
      const estimatedSharedFare = Math.round((booking.fare ?? 0) * 0.7);

      console.log(`   💰 Original fare: ${booking.fare}, Shared fare: ${estimatedSharedFare}`);

      const rideOption = {
        bookingId: booking.id!,
        primaryUser: {
          userId: booking.user!.userId,
          firstName: booking.user!.firstName,
          lastName: booking.user!.lastName,
          rating: (booking.user as any)?.rating,
        },
        startLocation: {
          latitude: booking.start_latitude,
          longitude: booking.start_longitude,
        },
        endLocation: {
          latitude: booking.end_latitude,
          longitude: booking.end_longitude,
        },
        pickup_time: booking.pickup_time,
        originalFare: booking.fare!,
        estimatedSharedFare,
        availableSeats: 3 - existingShares,
        distance: pickupDistance,
        matchPercentage: routeMatch.matchPercentage,
        shareType,
      };

      availableRides.push(rideOption);
      console.log(`   ✅ Added to available rides!`);
    }

    console.log(`\n🎯 Final available rides: ${availableRides.length}`);

    // If no rides found with strict criteria, provide fallback with broader search
    if (availableRides.length === 0 && allRequestedBookings.length > 0) {
      console.log('⚠️ No rides found with current criteria, attempting broader search...');
      
      // Try with relaxed parameters
      const relaxedTimeWindow = timeWindow * 2; // Double the time window
      const relaxedMaxPickupDistance = maxPickupDistance * 2; // Double pickup distance
      const relaxedMaxRouteDeviation = maxRouteDeviation * 1.5; // Increase route deviation
      
      const relaxedTimeStart = new Date(pickupTime.getTime() - relaxedTimeWindow * 60000);
      const relaxedTimeEnd = new Date(pickupTime.getTime() + relaxedTimeWindow * 60000);
      
      const relaxedBookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.user', 'user')
        .where('booking.status = :status', { status: Status.Requested })
        .andWhere('booking.pickup_time >= :timeStart AND booking.pickup_time <= :timeEnd', { 
          timeStart: relaxedTimeStart, 
          timeEnd: relaxedTimeEnd 
        })
        .andWhere('booking.user.userId != :userId', { userId })
        .getMany();
      
      console.log(`📋 Found ${relaxedBookings.length} bookings with relaxed criteria`);
      
      // Process relaxed bookings with more lenient filtering
      for (const booking of relaxedBookings) {
        const existingShares = await this.rideshareRepository.count({
          where: { 
            primaryBooking: { id: booking.id },
            status: RideshareStatus.ACCEPTED 
          }
        });
        
        if (existingShares >= 2) continue;
        
        const pickupDistance = this.calculateDistance(
          searchDto.pickupLat, searchDto.pickupLng,
          booking.start_latitude, booking.start_longitude
        );
        
        if (pickupDistance <= relaxedMaxPickupDistance * 1000) {
          const estimatedSharedFare = Math.round((booking.fare ?? 0) * 0.7);
          
          const rideOption = {
            bookingId: booking.id!,
            primaryUser: {
              userId: booking.user!.userId,
              firstName: booking.user!.firstName,
              lastName: booking.user!.lastName,
              rating: (booking.user as any)?.rating,
            },
            startLocation: {
              latitude: booking.start_latitude,
              longitude: booking.start_longitude,
            },
            endLocation: {
              latitude: booking.end_latitude,
              longitude: booking.end_longitude,
            },
            pickup_time: booking.pickup_time,
            originalFare: booking.fare!,
            estimatedSharedFare,
            availableSeats: 3 - existingShares,
            distance: pickupDistance,
            matchPercentage: 50, // Default for relaxed matches
            shareType: ShareType.ROUTE_SHARE,
            isRelaxedMatch: true, // Flag to indicate this is a relaxed match
          };
          
          availableRides.push(rideOption);
        }
      }
      
      console.log(`🎯 Added ${availableRides.length} rides from relaxed search`);
    }

    // Sort by best match (combination of distance and route similarity)
    const sortedRides = availableRides.sort((a, b) => {
      const scoreA = (a.matchPercentage * 0.7) + ((2000 - a.distance) / 2000 * 30);
      const scoreB = (b.matchPercentage * 0.7) + ((2000 - b.distance) / 2000 * 30);
      return scoreB - scoreA;
    });

    console.log('📊 Sorted rides:', sortedRides.map(r => ({
      bookingId: r.bookingId,
      score: (r.matchPercentage * 0.7) + ((2000 - r.distance) / 2000 * 30),
      matchPercentage: r.matchPercentage,
      distance: r.distance,
      isRelaxedMatch: (r as any).isRelaxedMatch
    })));

    return sortedRides;
  }

  async create(userId: number, createRideshareDto: CreateRideshareDto): Promise<RideshareResponseDto> {
    // Verify primary booking exists and is available
    const primaryBooking = await this.bookingRepository.findOne({
      where: { id: createRideshareDto.primaryBookingId },
      relations: ['user'],
    });

    if (!primaryBooking) {
      throw new NotFoundException('Primary booking not found');
    }

    if (primaryBooking.status !== Status.Requested) {
      throw new BadRequestException('Primary booking is not available for sharing');
    }

    if (primaryBooking.user && primaryBooking.user.userId === userId) {
      throw new BadRequestException('Cannot share your own ride');
    }

    // Get sharer user
    const sharerUser = await this.userRepository.findOne({
      where: { userId },
    });

    if (!sharerUser) {
      throw new NotFoundException('User not found');
    }

    // Calculate route and fare adjustments
    const routeInfo = await this.calculateSharedRouteInfo(
      primaryBooking.start_latitude, primaryBooking.start_longitude,
      primaryBooking.end_latitude, primaryBooking.end_longitude,
      createRideshareDto.sharer_pickup_latitude, createRideshareDto.sharer_pickup_longitude,
      createRideshareDto.sharer_dropoff_latitude, createRideshareDto.sharer_dropoff_longitude
    );

    // Calculate shared fare (typically 70% of proportional fare)
    const sharedFare = Math.round((primaryBooking.fare ?? 0) * 0.7);

    const rideshare = this.rideshareRepository.create({
      primaryBooking,
      sharerUser,
      shareType: createRideshareDto.shareType,
      sharer_pickup_latitude: createRideshareDto.sharer_pickup_latitude,
      sharer_pickup_longitude: createRideshareDto.sharer_pickup_longitude,
      sharer_dropoff_latitude: createRideshareDto.sharer_dropoff_latitude,
      sharer_dropoff_longitude: createRideshareDto.sharer_dropoff_longitude,
      shared_fare: sharedFare,
      distance_deviation: routeInfo.additionalDistance,
      time_deviation: routeInfo.additionalTime,
      sharer_notes: createRideshareDto.sharer_notes,
      pickup_time: createRideshareDto.pickup_time || primaryBooking.pickup_time,
      status: RideshareStatus.PENDING,
    });

    const savedRideshare = await this.rideshareRepository.save(rideshare);
    
    return this.mapToResponseDto(savedRideshare);
  }

  async findAll(): Promise<RideshareResponseDto[]> {
    const rideshares = await this.rideshareRepository.find({
      relations: ['primaryBooking', 'primaryBooking.user', 'sharerUser'],
      order: { created_at: 'DESC' }
    });

    return rideshares.map(rideshare => this.mapToResponseDto(rideshare));
  }

  async findUserRideshares(userId: number): Promise<RideshareResponseDto[]> {
    const rideshares = await this.rideshareRepository.find({
      where: [
        { sharerUser: { userId } },
        { primaryBooking: { user: { userId } } }
      ],
      relations: ['primaryBooking', 'primaryBooking.user', 'sharerUser'],
      order: { created_at: 'DESC' }
    });

    return rideshares.map(rideshare => this.mapToResponseDto(rideshare));
  }

  async findOne(id: number): Promise<RideshareResponseDto> {
    const rideshare = await this.rideshareRepository.findOne({
      where: { id },
      relations: ['primaryBooking', 'primaryBooking.user', 'sharerUser'],
    });

    if (!rideshare) {
      throw new NotFoundException(`Rideshare with id ${id} not found`);
    }

    return this.mapToResponseDto(rideshare);
  }

  async acceptRideshareRequest(userId: number, rideshareId: number, notes?: string): Promise<RideshareResponseDto> {
    const rideshare = await this.rideshareRepository.findOne({
      where: { id: rideshareId },
      relations: ['primaryBooking', 'primaryBooking.user', 'sharerUser'],
    });

    if (!rideshare) {
      throw new NotFoundException('Rideshare request not found');
    }

    if (!rideshare.primaryBooking.user || rideshare.primaryBooking.user.userId !== userId) {
      throw new BadRequestException('Only the primary booking owner can accept share requests');
    }

    if (rideshare.status !== RideshareStatus.PENDING) {
      throw new BadRequestException('Rideshare request is not pending');
    }

    rideshare.status = RideshareStatus.ACCEPTED;
    rideshare.accepted_at = new Date();
    rideshare.primary_user_notes = notes ?? '';

    const updatedRideshare = await this.rideshareRepository.save(rideshare);
    return this.mapToResponseDto(updatedRideshare);
  }

  async declineRideshareRequest(userId: number, rideshareId: number, notes?: string): Promise<RideshareResponseDto> {
    const rideshare = await this.rideshareRepository.findOne({
      where: { id: rideshareId },
      relations: ['primaryBooking', 'primaryBooking.user', 'sharerUser'],
    });

    if (!rideshare) {
      throw new NotFoundException('Rideshare request not found');
    }

    if (!rideshare.primaryBooking.user || rideshare.primaryBooking.user.userId !== userId) {
      throw new BadRequestException('Only the primary booking owner can decline share requests');
    }

    rideshare.status = RideshareStatus.DECLINED;
    rideshare.primary_user_notes = notes ?? '';

    const updatedRideshare = await this.rideshareRepository.save(rideshare);
    return this.mapToResponseDto(updatedRideshare);
  }

  async update(id: number, updateRideshareDto: UpdateRideshareDto): Promise<RideshareResponseDto> {
    const rideshare = await this.rideshareRepository.findOne({
      where: { id },
      relations: ['primaryBooking', 'primaryBooking.user', 'sharerUser'],
    });

    if (!rideshare) {
      throw new NotFoundException(`Rideshare with id ${id} not found`);
    }

    Object.assign(rideshare, updateRideshareDto);
    const updatedRideshare = await this.rideshareRepository.save(rideshare);
    
    return this.mapToResponseDto(updatedRideshare);
  }

  async remove(id: number): Promise<void> {
    const result = await this.rideshareRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Rideshare with id ${id} not found`);
    }
  }

  // Helper methods
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  private async calculateRouteMatch(
    pickup1Lat: number, pickup1Lng: number, dropoff1Lat: number, dropoff1Lng: number,
    pickup2Lat: number, pickup2Lng: number, dropoff2Lat: number, dropoff2Lng: number
  ): Promise<{ deviation: number; matchPercentage: number }> {
    try {
      // Calculate original route
      const originalRoute = await this.orsMapService.getRouteInfo(
        `${pickup2Lng},${pickup2Lat}`,
        `${dropoff2Lng},${dropoff2Lat}`
      );

      // Calculate shared route (pickup2 -> pickup1 -> dropoff1 -> dropoff2)
      const route1 = await this.orsMapService.getRouteInfo(
        `${pickup2Lng},${pickup2Lat}`,
        `${pickup1Lng},${pickup1Lat}`
      );
      const route2 = await this.orsMapService.getRouteInfo(
        `${pickup1Lng},${pickup1Lat}`,
        `${dropoff1Lng},${dropoff1Lat}`
      );
      const route3 = await this.orsMapService.getRouteInfo(
        `${dropoff1Lng},${dropoff1Lat}`,
        `${dropoff2Lng},${dropoff2Lat}`
      );

      const sharedDistance = route1.distance + route2.distance + route3.distance;
      const deviation = sharedDistance - originalRoute.distance;
      const matchPercentage = Math.max(0, 100 - (deviation / originalRoute.distance) * 100);

      return { deviation, matchPercentage };
    } catch (error) {
      // Fallback to simple distance calculation
      const originalDistance = this.calculateDistance(pickup2Lat, pickup2Lng, dropoff2Lat, dropoff2Lng);
      const deviation = originalDistance * 0.3; // Assume 30% deviation as fallback
      return { deviation, matchPercentage: 70 };
    }
  }

  private determineShareType(
    pickup1Lat: number, pickup1Lng: number, dropoff1Lat: number, dropoff1Lng: number,
    pickup2Lat: number, pickup2Lng: number, dropoff2Lat: number, dropoff2Lng: number
  ): ShareType {
    const pickupDistance = this.calculateDistance(pickup1Lat, pickup1Lng, pickup2Lat, pickup2Lng);
    const dropoffDistance = this.calculateDistance(dropoff1Lat, dropoff1Lng, dropoff2Lat, dropoff2Lng);

    if (pickupDistance < 500 && dropoffDistance < 500) {
      return ShareType.ROUTE_SHARE;
    } else if (pickupDistance < 500) {
      return ShareType.PICKUP_SHARE;
    } else if (dropoffDistance < 500) {
      return ShareType.DESTINATION_SHARE;
    } else {
      return ShareType.ROUTE_SHARE;
    }
  }

  private async calculateSharedRouteInfo(
    primaryPickupLat: number, primaryPickupLng: number,
    primaryDropoffLat: number, primaryDropoffLng: number,
    sharerPickupLat: number, sharerPickupLng: number,
    sharerDropoffLat: number, sharerDropoffLng: number
  ): Promise<{ additionalDistance: number; additionalTime: number }> {
    try {
      // This is a simplified calculation
      const additionalDistance = this.calculateDistance(
        primaryPickupLat, primaryPickupLng,
        sharerPickupLat, sharerPickupLng
      ) + this.calculateDistance(
        primaryDropoffLat, primaryDropoffLng,
        sharerDropoffLat, sharerDropoffLng
      );

      const additionalTime = Math.round(additionalDistance / 30 * 3600); // Assume 30 km/h average speed

      return { additionalDistance, additionalTime };
    } catch (error) {
      return { additionalDistance: 0, additionalTime: 0 };
    }
  }

  private mapToResponseDto(rideshare: Rideshare): RideshareResponseDto {
    return {
      id: rideshare.id,
      primaryBooking: {
        id: rideshare.primaryBooking.id ?? 0,
        start_latitude: rideshare.primaryBooking.start_latitude,
        start_longitude: rideshare.primaryBooking.start_longitude,
        end_latitude: rideshare.primaryBooking.end_latitude,
        end_longitude: rideshare.primaryBooking.end_longitude,
        pickup_time: rideshare.primaryBooking.pickup_time,
        fare: rideshare.primaryBooking.fare ?? 0,
        user: rideshare.primaryBooking.user
          ? {
              userId: rideshare.primaryBooking.user.userId,
              firstName: rideshare.primaryBooking.user.firstName,
              lastName: rideshare.primaryBooking.user.lastName,
              phone: rideshare.primaryBooking.user.phone,
            }
          : {
              userId: 0,
              firstName: '',
              lastName: '',
              phone: '',
            },
      },
      sharerUser: {
        userId: rideshare.sharerUser.userId,
        firstName: rideshare.sharerUser.firstName,
        lastName: rideshare.sharerUser.lastName,
        phone: rideshare.sharerUser.phone,
      },
      shareType: rideshare.shareType,
      status: rideshare.status,
      sharer_pickup_latitude: rideshare.sharer_pickup_latitude,
      sharer_pickup_longitude: rideshare.sharer_pickup_longitude,
      sharer_dropoff_latitude: rideshare.sharer_dropoff_latitude,
      sharer_dropoff_longitude: rideshare.sharer_dropoff_longitude,
      shared_fare: rideshare.shared_fare,
      distance_deviation: rideshare.distance_deviation,
      time_deviation: rideshare.time_deviation,
      sharer_notes: rideshare.sharer_notes,
      primary_user_notes: rideshare.primary_user_notes,
      created_at: rideshare.created_at,
    };
  }
}
