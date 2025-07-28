import { ShareType } from '../entities/rideshare.entity';

export class AvailableRideDto {
  bookingId: number;
  primaryUser: {
    userId: number;
    firstName: string;
    lastName: string;
    rating?: number;
  };
  startLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  endLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  pickup_time: Date;
  originalFare: number;
  estimatedSharedFare: number;
  availableSeats: number;
  distance: number; // Distance from user's pickup to ride's pickup
  matchPercentage: number; // How well the routes match
  shareType: ShareType;
}