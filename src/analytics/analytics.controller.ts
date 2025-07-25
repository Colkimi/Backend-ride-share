import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AtGuard } from 'src/auth/guards/at.guard';
import { CustomerDashboardDto } from './dto/customer-dashboard.dto';
import { AdminDashboardDto } from './dto/admin-dashboard.dto';
import { DriverDashboardDto } from './dto/driver-dashboard.dto';
import { BookingAnalyticsDto, BookingAnalyticsQueryDto } from './dto/booking-analytics.dto';
import { DriverAnalyticsDto, DriverAnalyticsQueryDto } from './dto/driver-analytics.dto';
import { CustomerAnalyticsDto, CustomerAnalyticsQueryDto } from './dto/customer-analytics.dto';
import { SystemStatusDto } from './dto/system-status.dto';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(AtGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard/customer/:userId')
  @ApiOperation({ summary: 'Get customer-specific dashboard analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Customer dashboard data retrieved successfully',
    type: CustomerDashboardDto
  })
  async getCustomerDashboard(@Param('userId') userId: string): Promise<CustomerDashboardDto> {
    return this.analyticsService.getCustomerDashboard(parseInt(userId));
  }

  @Get('dashboard/admin')
  @ApiOperation({ summary: 'Get admin dashboard analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin dashboard data retrieved successfully',
    type: AdminDashboardDto
  })
  async getAdminDashboard(): Promise<AdminDashboardDto> {
    return this.analyticsService.getAdminDashboard();
  }

  @Get('dashboard/driver/:driverId')
  @ApiOperation({ summary: 'Get driver-specific dashboard analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Driver dashboard data retrieved successfully',
    type: DriverDashboardDto
  })
  async getDriverDashboard(@Param('driverId') driverId: string): Promise<DriverDashboardDto> {
    return this.analyticsService.getDriverDashboard(parseInt(driverId));
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Get booking analytics with date range' })
  @ApiResponse({ 
    status: 200, 
    description: 'Booking analytics retrieved successfully',
    type: BookingAnalyticsDto
  })
  async getBookingAnalytics(
    @Query() query: BookingAnalyticsQueryDto
  ): Promise<BookingAnalyticsDto> {
    const start = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = query.endDate ? new Date(query.endDate) : new Date();
    return this.analyticsService.getBookingAnalytics(start, end);
  }

  @Get('drivers')
  @ApiOperation({ summary: 'Get driver analytics with date range' })
  @ApiResponse({ 
    status: 200, 
    description: 'Driver analytics retrieved successfully',
    type: DriverAnalyticsDto
  })
  async getDriverAnalytics(
    @Query() query: DriverAnalyticsQueryDto
  ): Promise<DriverAnalyticsDto> {
    const start = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = query.endDate ? new Date(query.endDate) : new Date();
    return this.analyticsService.getDriverAnalytics(start, end);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customer analytics with date range' })
  @ApiResponse({ 
    status: 200, 
    description: 'Customer analytics retrieved successfully',
    type: CustomerAnalyticsDto
  })
  async getCustomerAnalytics(
    @Query() query: CustomerAnalyticsQueryDto
  ): Promise<CustomerAnalyticsDto> {
    const start = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = query.endDate ? new Date(query.endDate) : new Date();
    return this.analyticsService.getCustomerAnalytics(start, end);
  }

  @Get('realtime/system-status')
  @ApiOperation({ summary: 'Get real-time system status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Real-time system metrics',
    type: SystemStatusDto
  })
  async getSystemStatus(): Promise<SystemStatusDto> {
    return this.analyticsService.getSystemStatus();
  }
}
