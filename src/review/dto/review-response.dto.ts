import { ApiProperty } from '@nestjs/swagger';
import { Review } from '../entities/review.entity';

export class ReviewResponseDto {
  @ApiProperty({
    description: 'Review ID',
    example: 1,
  })
  review_id: number;

  @ApiProperty({
    description: 'Rating given (1-5 stars)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  rating: number;

  @ApiProperty({
    description: 'Review comment',
    example: 'Excellent service! Very professional driver.',
    nullable: true,
  })
  comment?: string;

  @ApiProperty({
    description: 'When the review was created',
    example: '2025-01-15T10:30:00Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Reviewer information',
    example: {
      userId: 1,
      name: 'John Doe',
      profile_picture: 'https://example.com/avatar.jpg'
    }
  })
  reviewer: {
    userId: number;
    name: string;
    profile_picture?: string;
  };

  @ApiProperty({
    description: 'Reviewee information',
    example: {
      userId: 2,
      name: 'Jane Smith',
      profile_picture: 'https://example.com/avatar2.jpg'
    }
  })
  reviewee: {
    userId: number;
    name: string;
    profile_picture?: string;
  };

  @ApiProperty({
    description: 'Booking information if available',
    nullable: true,
  })
  booking?: {
    id: number;
    pickup_location: string;
    destination: string;
    created_at: Date;
  };

  @ApiProperty({
    description: 'Time ago formatted string',
    example: '2 hours ago',
  })
  timeAgo: string;

  @ApiProperty({
    description: 'Star rating as string for display',
    example: '★★★★★',
  })
  starDisplay: string;
}

export class PaginatedReviewsResponseDto {
  @ApiProperty({
    description: 'Array of reviews',
    type: [ReviewResponseDto],
  })
  data: ReviewResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      total: 45,
      totalPages: 5,
      hasNext: true,
      hasPrev: false
    }
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({
    description: 'Review statistics',
    example: {
      averageRating: 4.2,
      totalReviews: 45,
      ratingDistribution: {
        1: 2,
        2: 3,
        3: 8,
        4: 15,
        5: 17
      }
    }
  })
  stats: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  };
}
