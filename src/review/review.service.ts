import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedReviewsResponseDto, ReviewResponseDto } from './dto/review-response.dto';
import { Review } from './entities/review.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createReviewDto: CreateReviewDto): Promise<ReviewResponseDto> {
    const review = this.reviewRepository.create(createReviewDto);
    const saved = await this.reviewRepository.save(review);
    
    await this.clearReviewCaches();
    
    const fullReview = await this.reviewRepository.findOne({
      where: { review_id: saved.review_id },
      relations: ['reviewer', 'reviewee', 'booking']
    });
    
    if (!fullReview) {
      throw new NotFoundException(`Could not retrieve saved review`);
    }
    
    return this.formatReviewResponse(fullReview);
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedReviewsResponseDto> {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'timestamp', 
      sortOrder = 'DESC', 
      minRating, 
      maxRating, 
      search 
    } = query;
    
    const cacheKey = `reviews_paginated_${JSON.stringify(query)}`;
    const cached = await this.cacheManager.get<PaginatedReviewsResponseDto>(cacheKey);
    if (cached) return cached;

    const queryBuilder = this.createBaseQuery();
    
    // Apply filters
    if (minRating) {
      queryBuilder.andWhere('review.rating >= :minRating', { minRating });
    }
    if (maxRating) {
      queryBuilder.andWhere('review.rating <= :maxRating', { maxRating });
    }
    if (search) {
      queryBuilder.andWhere('review.comment ILIKE :search', { search: `%${search}%` });
    }

    // Apply sorting
    const orderDirection = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    switch (sortBy) {
      case 'rating':
        queryBuilder.orderBy('review.rating', orderDirection);
        break;
      case 'reviewer':
        queryBuilder.orderBy('reviewer.firstName', orderDirection);
        break;
      case 'reviewee':
        queryBuilder.orderBy('reviewee.firstName', orderDirection);
        break;
      default:
        queryBuilder.orderBy('review.timestamp', orderDirection);
    }

    // Get total count
    const total = await queryBuilder.getCount();
    
    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);
    
    const reviews = await queryBuilder.getMany();
    const formattedReviews = reviews.map(review => this.formatReviewResponse(review));
    
    // Get statistics
    const stats = await this.getReviewStats();
    
    // Build response
    const totalPages = Math.ceil(total / limit);
    const response: PaginatedReviewsResponseDto = {
      data: formattedReviews,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      stats,
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, response, 5 * 60 * 1000);
    return response;
  }

  async findByUser(userId: number, query: PaginationQueryDto): Promise<PaginatedReviewsResponseDto> {
    const queryBuilder = this.createBaseQuery();
    queryBuilder.andWhere('reviewee.userId = :userId', { userId });
    
    return this.executeQuery(queryBuilder, query, `user_${userId}_reviews`);
  }

  async findByDriver(driverId: number, query: PaginationQueryDto): Promise<PaginatedReviewsResponseDto> {
    const queryBuilder = this.createBaseQuery();
    queryBuilder
      .innerJoin('reviewee.driver', 'driver')
      .andWhere('driver.driver_id = :driverId', { driverId });
    
    return this.executeQuery(queryBuilder, query, `driver_${driverId}_reviews`);
  }

  async getReviewStats(): Promise<any> {
    const cacheKey = 'review_stats';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const [averageResult, totalReviews, ratingDistribution] = await Promise.all([
      this.reviewRepository
        .createQueryBuilder('review')
        .select('AVG(review.rating)', 'average')
        .getRawOne(),
      
      this.reviewRepository.count(),
      
      this.reviewRepository
        .createQueryBuilder('review')
        .select('review.rating', 'rating')
        .addSelect('COUNT(*)', 'count')
        .groupBy('review.rating')
        .getRawMany()
    ]);

    const distributionMap = ratingDistribution.reduce((acc, item) => {
      acc[item.rating] = parseInt(item.count);
      return acc;
    }, {} as Record<number, number>);

    // Fill missing ratings with 0
    for (let i = 1; i <= 5; i++) {
      if (!distributionMap[i]) distributionMap[i] = 0;
    }

    const stats = {
      averageRating: parseFloat(averageResult?.average || 0).toFixed(1),
      totalReviews,
      ratingDistribution: distributionMap,
    };

    await this.cacheManager.set(cacheKey, stats, 10 * 60 * 1000); // Cache for 10 minutes
    return stats;
  }

  private createBaseQuery(): SelectQueryBuilder<Review> {
    return this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.reviewer', 'reviewer')
      .leftJoinAndSelect('review.reviewee', 'reviewee')
      .leftJoinAndSelect('review.booking', 'booking');
  }

  private async executeQuery(
    queryBuilder: SelectQueryBuilder<Review>,
    query: PaginationQueryDto,
    cachePrefix: string
  ): Promise<PaginatedReviewsResponseDto> {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'timestamp', 
      sortOrder = 'DESC', 
      minRating, 
      maxRating, 
      search 
    } = query;
    
    const cacheKey = `${cachePrefix}_${JSON.stringify(query)}`;
    const cached = await this.cacheManager.get<PaginatedReviewsResponseDto>(cacheKey);
    if (cached) return cached;

    // Apply filters
    if (minRating) {
      queryBuilder.andWhere('review.rating >= :minRating', { minRating });
    }
    if (maxRating) {
      queryBuilder.andWhere('review.rating <= :maxRating', { maxRating });
    }
    if (search) {
      queryBuilder.andWhere('review.comment ILIKE :search', { search: `%${search}%` });
    }

    // Apply sorting
    const orderDirection = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    switch (sortBy) {
      case 'rating':
        queryBuilder.orderBy('review.rating', orderDirection);
        break;
      case 'reviewer':
        queryBuilder.orderBy('reviewer.firstName', orderDirection);
        break;
      case 'reviewee':
        queryBuilder.orderBy('reviewee.firstName', orderDirection);
        break;
      default:
        queryBuilder.orderBy('review.timestamp', orderDirection);
    }

    // Get total count
    const total = await queryBuilder.getCount();
    
    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);
    
    const reviews = await queryBuilder.getMany();
    const formattedReviews = reviews.map(review => this.formatReviewResponse(review));
    
    // Get targeted statistics for this query
    const stats = await this.getFilteredStats(queryBuilder);
    
    const totalPages = Math.ceil(total / limit);
    const response: PaginatedReviewsResponseDto = {
      data: formattedReviews,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      stats,
    };

    await this.cacheManager.set(cacheKey, response, 5 * 60 * 1000);
    return response;
  }

  private async getFilteredStats(queryBuilder: SelectQueryBuilder<Review>): Promise<any> {
    const statsQuery = queryBuilder.clone();
    
    const [averageResult, totalReviews, ratingDistribution] = await Promise.all([
      statsQuery
        .select('AVG(review.rating)', 'average')
        .getRawOne(),
      
      statsQuery.getCount(),
      
      statsQuery
        .select('review.rating', 'rating')
        .addSelect('COUNT(*)', 'count')
        .groupBy('review.rating')
        .getRawMany()
    ]);

    const distributionMap = ratingDistribution.reduce((acc, item) => {
      acc[item.rating] = parseInt(item.count);
      return acc;
    }, {} as Record<number, number>);

    for (let i = 1; i <= 5; i++) {
      if (!distributionMap[i]) distributionMap[i] = 0;
    }

    return {
      averageRating: parseFloat(averageResult?.average || 0).toFixed(1),
      totalReviews,
      ratingDistribution: distributionMap,
    };
  }

  private formatReviewResponse(review: Review): ReviewResponseDto {
    return {
      review_id: review.review_id || 0,
      rating: review.rating,
      comment: review.comment,
      timestamp: review.timestamp || new Date(),
      reviewer: {
        userId: review.reviewer?.userId || 0,
        name: review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : 'Unknown User',
        profile_picture: undefined, // Add this field to User entity if needed
      },
      reviewee: {
        userId: review.reviewee?.userId || 0,
        name: review.reviewee ? `${review.reviewee.firstName} ${review.reviewee.lastName}` : 'Unknown User',
        profile_picture: undefined, // Add this field to User entity if needed
      },
      booking: review.booking ? {
        id: review.booking.id || 0,
        pickup_location: `${review.booking.start_latitude}, ${review.booking.start_longitude}`,
        destination: `${review.booking.end_latitude}, ${review.booking.end_longitude}`,
        created_at: review.booking.pickup_time || new Date(),
      } : undefined,
      timeAgo: this.getTimeAgo(review.timestamp || new Date()),
      starDisplay: '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating),
    };
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  }

  private async clearReviewCaches(): Promise<void> {
    const patterns = [
      'all_reviews',
      'review_stats',
      'reviews_paginated_*',
      'user_*_reviews',
      'driver_*_reviews'
    ];
    
    // In a production environment, you'd implement cache pattern clearing
    // For now, we'll clear the main caches
    await Promise.all([
      this.cacheManager.del('all_reviews'),
      this.cacheManager.del('review_stats'),
    ]);
  }

  async findAll(): Promise<Review[]> {
    const cached = await this.cacheManager.get<Review[]>('all_reviews');
    if (cached) return cached;
    
    const reviews = await this.reviewRepository.find({
      relations: ['reviewer', 'reviewee', 'booking']
    });
    
    await this.cacheManager.set('all_reviews', reviews);
    return reviews;
  }

  async findOne(id: number): Promise<ReviewResponseDto> {
    const cacheKey = `review_${id}`;
    const cached = await this.cacheManager.get<ReviewResponseDto>(cacheKey);
    if (cached) return cached;
    
    const review = await this.reviewRepository.findOne({
      where: { review_id: id },
      relations: ['reviewer', 'reviewee', 'booking']
    });
    
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
    
    const formatted = this.formatReviewResponse(review);
    await this.cacheManager.set(cacheKey, formatted);
    return formatted;
  }

  async update(id: number, updateReviewDto: UpdateReviewDto): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { review_id: id },
      relations: ['reviewer', 'reviewee', 'booking']
    });
    
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
    
    Object.assign(review, updateReviewDto);
    const updated = await this.reviewRepository.save(review);
    
    // Clear caches
    await this.clearReviewCaches();
    await this.cacheManager.del(`review_${id}`);
    
    return this.formatReviewResponse(updated);
  }

  async remove(id: number): Promise<string> {
    const result = await this.reviewRepository.delete(id);
    
    // Clear caches
    await this.clearReviewCaches();
    await this.cacheManager.del(`review_${id}`);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
    return `Review with ID ${id} deleted successfully`;
  }
}
