import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
  BadRequestException,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { AtGuard, RolesGuard } from 'src/auth/guards';
import { Public, Roles, GetCurrentUserId } from 'src/auth/decorators';
import { Role } from 'src/users/entities/user.entity';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { MatchDriverDto, AssignDriverDto } from './dto/match-driver.dto';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(AtGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @SkipThrottle()
  @Public()
  @Get('autocomplete')
  autocomplete(@Query('query') query: string) {
    return this.bookingsService.autocompleteLocation(query);
  }

  @SkipThrottle()
  @Get('route')
  @ApiOperation({ summary: 'Get route information' })
  @ApiQuery({ name: 'startLat', type: String, example: '49.41461' })
  @ApiQuery({ name: 'startLng', type: String, example: '8.681495' })
  @ApiQuery({ name: 'endLat', type: String, example: '49.420318' })
  @ApiQuery({ name: 'endLng', type: String, example: '8.687872' })
  @ApiResponse({ status: 200, description: 'Route information retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async getRoute(
    @Query('startLat') startLat: string,
    @Query('startLng') startLng: string,
    @Query('endLat') endLat: string,
    @Query('endLng') endLng: string
  ) {
    const parsedStartLat = this.parseFloat(startLat, 'startLat');
    const parsedStartLng = this.parseFloat(startLng, 'startLng');
    const parsedEndLat = this.parseFloat(endLat, 'endLat');
    const parsedEndLng = this.parseFloat(endLng, 'endLng');

    return this.bookingsService.getRoute(parsedStartLat, parsedStartLng, parsedEndLat, parsedEndLng);
  }

  private parseFloat(value: string, paramName: string): number {
    if (value === undefined || value === '') {
      throw new BadRequestException(`${paramName} is required`);
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      throw new BadRequestException(`${paramName} must be a valid number`);
    }
    return parsed;
  }

  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @Post()
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Req() req: Request,
    @GetCurrentUserId() userId?: number, 
  ) {
    const accessToken = req.headers.authorization?.split(' ')[1]; 
    return this.bookingsService.create(createBookingDto, accessToken, userId);
  }

  @SkipThrottle()
  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @Get()
  async findAll(@GetCurrentUserId() userId: number) {
    return this.bookingsService.findAll();
  }

  @Roles(Role.CUSTOMER)
  @SkipThrottle()
  @Get('my-bookings')
  @ApiOperation({ summary: 'Get bookings for the authenticated customer' })
  @ApiResponse({ status: 200, description: 'Customer bookings retrieved successfully' })
  async findMyBookings(@GetCurrentUserId() userId: number) {
    return this.bookingsService.findUserBookings(userId);
  }

  @Roles(Role.DRIVER)
  @SkipThrottle()
  @Get('driver-bookings')
  @ApiOperation({ summary: 'Get bookings for the authenticated driver' })
  @ApiResponse({ status: 200, description: 'Driver bookings retrieved successfully' })
  async findDriverBookings(@GetCurrentUserId() userId: number) {
    const driver = await this.bookingsService.getDriverByUserId(userId);
    
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }
    if (typeof driver.driver_id !== 'number') {
      throw new NotFoundException('Driver ID not found');
    }
    
    return this.bookingsService.findDriverBookings(driver.driver_id);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @SkipThrottle()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @GetCurrentUserId() userId: number) {
    return this.bookingsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.remove(id);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @SkipThrottle()
  @Get(':id/nearby-drivers')
  @ApiOperation({ summary: 'Get nearby available drivers for a booking' })
  @ApiQuery({ name: 'maxRadiusKm', type: Number, required: false, example: 5 })
  @ApiQuery({ name: 'maxResults', type: Number, required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'List of nearby drivers' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getNearbyDrivers(
    @Param('id', ParseIntPipe) bookingId: number,
    @Query('maxRadiusKm') maxRadiusKm?: number,
    @Query('maxResults') maxResults?: number
  ) {
    return this.bookingsService.getAvailableDriversNearBooking(
      bookingId,
      maxRadiusKm || 5,
      maxResults || 10
    );
  }

  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Post(':id/assign-driver')
  @ApiOperation({ summary: 'Assign a specific driver to booking' })
  @ApiResponse({ status: 200, description: 'Driver assigned successfully' })
  @ApiResponse({ status: 404, description: 'Booking or driver not found' })
  @ApiResponse({ status: 400, description: 'Driver not available' })
  async assignDriver(
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() assignDriverDto: AssignDriverDto
  ) {
    if (assignDriverDto.bookingId !== bookingId) {
      throw new BadRequestException('Booking ID mismatch');
    }
    return this.bookingsService.assignDriverToBooking(bookingId, assignDriverDto.driverId);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Post(':id/auto-assign')
  @ApiOperation({ summary: 'Auto-assign nearest available driver to booking' })
  @ApiResponse({ status: 200, description: 'Driver auto-assigned successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 400, description: 'No available drivers found' })
  async autoAssignDriver(@Param('id', ParseIntPipe) bookingId: number) {
    return this.bookingsService.autoAssignNearestDriver(bookingId);
  }

  @Roles(Role.DRIVER, Role.ADMIN)
  @Get(':id/route-instructions')
  @ApiOperation({ summary: 'Get detailed route instructions for driver' })
  @ApiResponse({ status: 200, description: 'Route instructions retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getRouteInstructions(@Param('id', ParseIntPipe) bookingId: number) {
    const booking = await this.bookingsService.findOne(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking with id ${bookingId} not found`);
    }

    const routeData = await this.bookingsService.getRouteWithInstructions(
      booking.start_latitude,
      booking.start_longitude,
      booking.end_latitude,
      booking.end_longitude
    );

    return {
      bookingId,     
      pickupLocation: {
        latitude: booking.start_latitude,
        longitude: booking.start_longitude
      },
      dropoffLocation: {
        latitude: booking.end_latitude,
        longitude: booking.end_longitude
      },
      instructions: routeData.formattedInstructions,
      totalDistance: routeData.distance,
      totalDuration: routeData.duration,
      estimatedArrival: new Date(Date.now() + routeData.duration * 1000)
    };
  }
}
