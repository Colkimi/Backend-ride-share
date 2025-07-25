import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SeedingService } from './seeding.service';

@ApiTags('seeding')
@Controller('seeding')
export class SeedingController {
  constructor(private readonly seedingService: SeedingService) {}

  @Post('seed-all')
  @ApiOperation({ summary: 'Seed the entire database with test data' })
  @ApiResponse({ status: 200, description: 'Database seeded successfully' })
  @ApiResponse({ status: 500, description: 'Error during seeding' })
  async seedAll() {
    await this.seedingService.seedAll();
    return { message: 'Database seeded successfully!' };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get current database statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Database statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: { type: 'number' },
        drivers: { type: 'number' },
        vehicles: { type: 'number' },
        locations: { type: 'number' },
        bookings: { type: 'number' },
        reviews: { type: 'number' },
        pricing: { type: 'number' },
        discounts: { type: 'number' },
        paymentMethods: { type: 'number' },
      }
    }
  })
  async getStats() {
    return await this.seedingService.getSeedingStats();
  }

  @Post('clear-all')
  @ApiOperation({ summary: 'Clear all data from the database' })
  @ApiResponse({ status: 200, description: 'All data cleared successfully' })
  @ApiResponse({ status: 500, description: 'Error during clearing' })
  async clearAll() {
    try {
      await this.seedingService['clearAllData']();
      return { message: 'All data cleared successfully!' };
    } catch (error) {
      throw new Error(`Failed to clear data: ${error.message}`);
    }
  }

  @Post('seed-users')
  @ApiOperation({ summary: 'Seed only users (customers and drivers)' })
  @ApiResponse({ status: 200, description: 'Users seeded successfully' })
  async seedUsers() {
    const users = await this.seedingService.seedUsersOnly();
    return { message: `${users.length} users seeded successfully!` };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check seeding service health and database stats' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service health check successful',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        stats: { type: 'object' },
        timestamp: { type: 'string' },
      }
    }
  })
  async health() {
    const stats = await this.seedingService.getSeedingStats();
    return {
      status: 'ok',
      stats,
      timestamp: new Date().toISOString(),
    };
  }
}
