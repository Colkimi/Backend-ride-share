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
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedReviewsResponseDto, ReviewResponseDto } from './dto/review-response.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AtGuard, RolesGuard } from 'src/auth/guards';
import { Role } from 'src/users/entities/user.entity';
import { Roles } from 'src/auth/decorators';

@ApiTags('review')
@Controller('review')
@UseGuards(AtGuard, RolesGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Post()
  @ApiOperation({ 
    summary: 'Create a new review',
    description: 'Allows customers to create reviews for drivers after completing a ride'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Review created successfully',
    type: ReviewResponseDto 
  })
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewService.create(createReviewDto);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @Get()
  @ApiOperation({ 
    summary: 'Get paginated reviews with filtering and sorting',
    description: 'Retrieve reviews with pagination, search, filtering by rating, and sorting options'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Reviews retrieved successfully',
    type: PaginatedReviewsResponseDto 
  })
  findAll(@Query() query: PaginationQueryDto): Promise<PaginatedReviewsResponseDto> {
    return this.reviewService.findAllPaginated(query);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @Get('stats')
  @ApiOperation({ 
    summary: 'Get review statistics',
    description: 'Get overall review statistics including average rating and distribution'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Review statistics retrieved successfully'
  })
  getStats() {
    return this.reviewService.getReviewStats();
  }

  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @Get('user/:userId')
  @ApiOperation({ 
    summary: 'Get reviews for a specific user',
    description: 'Get all reviews received by a specific user (driver or customer)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User reviews retrieved successfully',
    type: PaginatedReviewsResponseDto 
  })
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedReviewsResponseDto> {
    return this.reviewService.findByUser(userId, query);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @Get('driver/:driverId')
  @ApiOperation({ 
    summary: 'Get reviews for a specific driver',
    description: 'Get all reviews received by a specific driver with enhanced formatting'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Driver reviews retrieved successfully',
    type: PaginatedReviewsResponseDto 
  })
  findByDriver(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedReviewsResponseDto> {
    return this.reviewService.findByDriver(driverId, query);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a single review by ID',
    description: 'Retrieve detailed information about a specific review'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Review retrieved successfully',
    type: ReviewResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ReviewResponseDto> {
    return this.reviewService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update a review',
    description: 'Update an existing review (only by the reviewer or admin)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Review updated successfully',
    type: ReviewResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.update(id, updateReviewDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete a review',
    description: 'Delete a review (admin only)'
  })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return this.reviewService.remove(id);
  }
}
