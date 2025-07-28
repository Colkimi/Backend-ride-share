import { RideshareStatus, ShareType } from '../entities/rideshare.entity';

export class RideshareResponseDto {
  id: number;
  primaryBooking: {
    id: number;
    start_latitude: number;
    start_longitude: number;
    end_latitude: number;
    end_longitude: number;
    pickup_time: Date;
    fare: number;
    user: {
      userId: number;
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  sharerUser: {
    userId: number;
    firstName: string;
    lastName: string;
    phone: string;
  };
  shareType: ShareType;
  status: RideshareStatus;
  sharer_pickup_latitude: number;
  sharer_pickup_longitude: number;
  sharer_dropoff_latitude: number;
  sharer_dropoff_longitude: number;
  shared_fare: number;
  distance_deviation?: number;
  time_deviation?: number;
  sharer_notes?: string;
  primary_user_notes?: string;
  created_at: Date;
}