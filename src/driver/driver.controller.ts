import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DriverService } from './driver.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AtGuard, RolesGuard } from 'src/auth/guards';
import { Role } from 'src/users/entities/user.entity';
import { Roles } from 'src/auth/decorators';
import { Driver } from './entities/driver.entity';
import { VehicleService } from 'src/vehicle/vehicle.service';
import { GetCurrentUserId } from 'src/auth/decorators/get-current-user-id.decorator';
import { ForbiddenException } from '@nestjs/common';
import { LocationService } from 'src/location/location.service';
import { DriverPickupProgressDto, PickupConfirmationDto } from './dto/driver-pickup-progress.dto';
import { Booking } from 'src/bookings/entities/booking.entity';
import { DriverBookingResponseDto } from './dto/driver-booking-action.dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('driver')
@Controller('driver')
@UseGuards(AtGuard, RolesGuard)
export class DriverController {
  constructor(
    private readonly driverService: DriverService,
    private readonly vehicleService: VehicleService,
    private readonly locationService: LocationService,
  ) {}

  @Roles(Role.ADMIN, Role.DRIVER)
  @Post()
  @ApiOperation({
    summary: 'Create a new driver',
    description: 'Creates a new driver.',
  })
  @ApiResponse({
    status: 201,
    description: 'Driver created successfully',
    type: Driver,
  })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({
    description: 'You do not have permissions to access this resource.',
  })
  create(@Body() createDriverDto: CreateDriverDto) {
    return this.driverService.create(createDriverDto);
  }

  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.driverService.findAll();
  }

  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @Get('available')
  @ApiOperation({
    summary: 'Get all available drivers',
    description: 'Retrieve a list of all drivers that are currently available for booking',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available drivers retrieved successfully',
    type: [Driver],
  })
  async getAvailableDrivers() {
    return this.driverService.findAvailableDrivers();
  }

  @Roles(Role.DRIVER)
  @SkipThrottle()
  @Get('bookings')
  @ApiOperation({ summary: 'Get all bookings assigned to the authenticated driver' })
  @ApiResponse({ status: 200, description: 'List of bookings assigned to the driver', type: [Booking] })
  async getDriverBookings(@GetCurrentUserId() currentUserId: number) {
    return this.driverService.getDriverBookings(currentUserId);
  }

  @Roles(Role.DRIVER)
  @Get('bookings/pending')
  @ApiOperation({ summary: 'Get pending bookings assigned to the authenticated driver' })
  @ApiResponse({ status: 200, description: 'List of pending bookings assigned to the driver', type: [Booking] })
  async getPendingBookings(@GetCurrentUserId() currentUserId: number) {
    return this.driverService.getPendingBookingsForDriver(currentUserId);
  }

  @Roles(Role.DRIVER)
  @Post('bookings/:id/accept')
  @ApiOperation({ summary: 'Accept a booking assigned to the authenticated driver' })
  @ApiResponse({ status: 200, description: 'Booking accepted successfully', type: DriverBookingResponseDto })
  async acceptBooking(
    @GetCurrentUserId() currentUserId: number,
    @Param('id', ParseIntPipe) bookingId: number
  ) {
    const driver = await this.driverService.findByUserId(currentUserId);
    if (!driver) {
      throw new NotFoundException(`Driver profile not found for authenticated user (user ID: ${currentUserId}). Please ensure you have completed driver registration.`);
    }
    if (driver.driver_id === undefined || driver.driver_id === null) {
      throw new NotFoundException(`Driver ID is missing for authenticated user (user ID: ${currentUserId}). Please contact support.`);
    }
    return this.driverService.acceptBooking(currentUserId, bookingId);
  }

  @Roles(Role.DRIVER)
  @Post('bookings/:id/reject')
  @ApiOperation({ summary: 'Reject a booking assigned to the authenticated driver' })
  @ApiResponse({ status: 200, description: 'Booking rejected successfully with optional reassignment', type: DriverBookingResponseDto })
  async rejectBooking(
    @GetCurrentUserId() currentUserId: number,
    @Param('id', ParseIntPipe) bookingId: number
  ) {
    const driver = await this.driverService.findByUserId(currentUserId);
    if (!driver) {
      throw new NotFoundException(`Driver profile not found for authenticated user (user ID: ${currentUserId}). Please ensure you have completed driver registration.`);
    }
    if (driver.driver_id === undefined || driver.driver_id === null) {
      throw new NotFoundException(`Driver ID is missing for authenticated user (user ID: ${currentUserId}). Please contact support.`);
    }
    
    const booking = await this.driverService.rejectBookingWithReassignment(driver.driver_id, bookingId);
    return booking;
  }

  @Roles(Role.DRIVER)
  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking details for the authenticated driver' })
  @ApiResponse({ status: 200, description: 'Booking details', type: Booking })
  async getBookingDetails(
    @GetCurrentUserId() currentUserId: number,
    @Param('id', ParseIntPipe) bookingId: number
  ) {
    return this.driverService.getBookingDetailsForDriver(currentUserId, bookingId);
  }

  @Roles(Role.ADMIN, Role.DRIVER)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.driverService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.DRIVER)
  @Get(':id/vehicles')
  async findVehicles(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUserId() currentUserId: number,
  ) {
    if (currentUserId !== id) {
      throw new ForbiddenException(
        'You are not authorized to view vehicles of other drivers',
      );
    }
    return this.vehicleService.findByDriverId(id);
  }

  @Roles(Role.ADMIN, Role.DRIVER)
  @Get('by-user/:userId')
  @ApiOperation({
    summary: 'Get driver profile by user ID',
    description: 'Retrieves driver profile for a specific user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver profile retrieved successfully',
    type: Driver,
  })
  @ApiResponse({
  status: 403,
  description: 'Unauthorized access to another driver\'s profile'
})
  @ApiResponse({
    status: 404,
    description: 'Driver profile not found for this user',
  })
  async findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @GetCurrentUserId() currentUserId: number,
  ) {
  const currentUser = await this.driverService.findByUserId(currentUserId);
  try {
    const driver = await this.driverService.findByUserIdEnhanced(userId);
    
    if (!driver) {
      throw new NotFoundException(`Driver profile not found for user with id ${userId}`);
    }
    
    const enhancedResponse = {
      ...driver,
      stats: driver.driver_id !== undefined
        ? await this.driverService.getDriverStats(driver.driver_id)
        : null
    };
    
    return enhancedResponse;
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    
    console.error(`Error fetching driver for user ${userId}:`, error);
    throw new InternalServerErrorException('Unable to retrieve driver profile. Please try again later.');
  }
}

  @Roles(Role.ADMIN, Role.DRIVER)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    return this.driverService.update(id, updateDriverDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.driverService.remove(id);
  }

  @Roles(Role.ADMIN, Role.DRIVER)
  @Post(':id/location')
  @ApiOperation({
    summary: 'Update driver location',
    description: 'Updates the live location of a specific driver',
  })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid coordinates' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({
    description: 'You do not have permissions to access this resource.',
  })
  async updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDriverLocationDto: UpdateDriverLocationDto,
  ) {
    const result = await this.locationService.updateLiveLocation(
      id,
      updateDriverLocationDto.latitude,
      updateDriverLocationDto.longitude,
    );
    
    if (!result) {
      return { message: 'Location update skipped (too frequent updates)' };
    }

    return {
      message: 'Location updated successfully',
      location: {
        latitude: result.latitude,
        longitude: result.longitude,
        lastUpdate: result.lastUpdate,
      },
    };
  }

  @Roles(Role.ADMIN, Role.DRIVER)
  @Get(':id/pickup-progress')
  @ApiOperation({
    summary: 'Get driver pickup progress',
    description: 'Get real-time progress of driver to pickup location',
  })
  @ApiResponse({
    status: 200,
    description: 'Pickup progress retrieved successfully',
    type: DriverPickupProgressDto,
  })
  @ApiQuery({ name: 'bookingId', required: true, type: Number, description: 'Booking ID' })
  @ApiQuery({ name: 'pickupLat', required: true, type: Number, description: 'Pickup latitude' })
  @ApiQuery({ name: 'pickupLng', required: true, type: Number, description: 'Pickup longitude' })
  async getPickupProgress(
    @Param('id', ParseIntPipe) id: number,
    @Query('bookingId') bookingId: number,
    @Query('pickupLat') pickupLat: number,
    @Query('pickupLng') pickupLng: number,
  ) {
    return await this.driverService.getDriverPickupProgress(id, bookingId, pickupLat, pickupLng);
  }

  @Roles(Role.ADMIN, Role.DRIVER)
  @Post(':id/confirm-pickup')
  @ApiOperation({
    summary: 'Confirm pickup',
    description: 'Confirm driver has arrived at pickup location',
  })
  @ApiResponse({
    status: 200,
    description: 'Pickup confirmed successfully',
    type: PickupConfirmationDto,
  })
  async confirmPickup(
    @Param('id', ParseIntPipe) id: number,
    @Body() pickupConfirmation: PickupConfirmationDto,
  ) {
    return await this.driverService.confirmPickup(pickupConfirmation);
  }

}
