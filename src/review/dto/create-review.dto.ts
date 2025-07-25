import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @IsNumber()
  @IsOptional()
  review_id?: number;

  
  @ApiProperty({ description: 'Reviewer user ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  reviewer_id: number;

  @ApiProperty({ description: 'Reviewee user ID', example: 2 })
  @IsInt()
  @IsNotEmpty()
  reviewee_id: number;

  @ApiProperty({ description: 'Rating from 1 to 5', example: 4 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Comment for the review',
    example: 'Great service!',
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    description: 'Timestamp of the review',
    example: '2025-07-01T12:00:00Z',
  })
  @IsOptional()
  timestamp?: Date;
}
