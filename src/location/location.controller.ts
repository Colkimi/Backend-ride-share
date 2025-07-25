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
} from '@nestjs/common';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AtGuard, RolesGuard } from 'src/auth/guards';
import { Role } from 'src/users/entities/user.entity';
import { Roles } from 'src/auth/decorators';
import { SkipThrottle } from '@nestjs/throttler';
import { GetCurrentUserId } from 'src/auth/decorators'; 
import { Location } from './entities/location.entity';

@ApiTags('location')
@Controller('location')
@UseGuards(AtGuard, RolesGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @SkipThrottle()
  @Roles(Role.ADMIN, Role.DRIVER, Role.CUSTOMER)
  @Get('autocomplete')
  autocomplete(@Query('query') query: string) {
    return this.locationService.autocompleteLocation(query);
  }

  @Roles(Role.DRIVER, Role.CUSTOMER)
  @Get('my-locations')
  @ApiOperation({
    summary: 'Get locations for the authenticated user',
    description: 'Retrieves all saved locations for the current authenticated user',
  })
  findMyLocations(@GetCurrentUserId() userId: number) {
    return this.locationService.findByUserId(userId);
  }

  // Updated: Create location for authenticated user
  @Roles(Role.DRIVER, Role.CUSTOMER)
  @Post()
  @ApiOperation({
    summary: 'Create a new location for the authenticated user',
    description: 'Creates a new saved location for the current authenticated user',
  })
  @ApiResponse({
    status: 201,
    description: 'Location created successfully',
    type: Location,
  })
  create(
    @Body() createLocationDto: CreateLocationDto,
    @GetCurrentUserId() userId: number
  ) {
    return this.locationService.createForUser(createLocationDto, userId);
  }

  // New: Admin endpoint to create location for any user
  @Roles(Role.ADMIN)
  @Post('admin/user/:userId')
  @ApiOperation({
    summary: 'Admin: Create location for a specific user',
    description: 'Admin endpoint to create a location for any user',
  })
  createForUser(
    @Body() createLocationDto: CreateLocationDto,
    @Param('userId', ParseIntPipe) userId: number
  ) {
    return this.locationService.createForUser(createLocationDto, userId);
  }

  @Roles(Role.ADMIN, Role.DRIVER, Role.CUSTOMER)
  @Get()
  findAll() {
    return this.locationService.findAll();
  }

  @Roles(Role.ADMIN, Role.DRIVER, Role.CUSTOMER)
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get locations for a specific user',
    description: 'Retrieves all saved locations for a given user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User locations retrieved successfully',
    type: [Location],
  })
  @ApiResponse({
    status: 404,
    description: 'User not found or no locations found',
  })
  findByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.locationService.findByUserId(userId);
  }

  @Roles(Role.ADMIN, Role.DRIVER, Role.CUSTOMER)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.locationService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.DRIVER, Role.CUSTOMER)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLocationDto: UpdateLocationDto,
    @GetCurrentUserId() userId: number
  ) {
    return this.locationService.updateForUser(id, updateLocationDto, userId);
  }

  @Roles(Role.ADMIN, Role.DRIVER, Role.CUSTOMER)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUserId() userId: number
  ) {
    return this.locationService.removeForUser(id, userId);
  }
}
