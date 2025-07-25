import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, In } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { Booking } from 'src/bookings/entities/booking.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { Review } from 'src/review/entities/review.entity';
import { Status } from 'src/bookings/entities/booking.entity';
import { Status as DriverStatus } from 'src/driver/entities/driver.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Driver) private driverRepository: Repository<Driver>,
    @InjectRepository(Booking) private bookingRepository: Repository<Booking>,
    @InjectRepository(Vehicle) private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
  ) {}

  private formatCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  private formatPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 10000) / 100 : 0;
  }

  // Customer Dashboard Analytics
  async getCustomerDashboard(userId: number) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Total bookings and expenditure
    const totalBookings = await this.bookingRepository.count({ 
      where: { user: { userId } } 
    });
    
    const totalExpenditure = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.user_id = :userId', { userId })
      .select('COALESCE(SUM(booking.fare), 0)', 'total')
      .getRawOne();

    // Monthly stats for last 6 months
    const monthlyStats: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthKey = monthStart.toISOString().slice(0, 7);
      
      const count = await this.bookingRepository.count({
        where: {
          user: { userId },
        },
      });
      monthlyStats[monthKey] = count;
    }

    // Ride time distribution
    const bookings = await this.bookingRepository.find({
      where: { user: { userId } },
      relations: ['driver', 'vehicle'],
    });

    const rideTimeDistribution = {
      '<10 mins': 0,
      '10-30 mins': 0,
      '>30 mins': 0,
    };

    bookings.forEach(booking => {
      const duration = booking.duration || 0;
      if (duration < 600) rideTimeDistribution['<10 mins']++;
      else if (duration < 1800) rideTimeDistribution['10-30 mins']++;
      else rideTimeDistribution['>30 mins']++;
    });

    // Weekly trends
    const currentWeekCount = await this.bookingRepository.count({
      where: {
        user: { userId },
        pickup_time: MoreThan(lastWeek),
      },
    });

    const previousWeekCount = await this.bookingRepository.count({
      where: {
        user: { userId },
        pickup_time: Between(twoWeeksAgo, lastWeek),
      },
    });

    const percentageChange = previousWeekCount > 0 
      ? ((currentWeekCount - previousWeekCount) / previousWeekCount) * 100 
      : 0;

    // Recent bookings
    const recentBookings = await this.bookingRepository.find({
      where: { user: { userId } },
      relations: ['driver', 'vehicle', 'pricing', 'discount'],
      order: { pickup_time: 'DESC' },
      take: 10,
    });

    // Expenditure trends (last 30 days)
    const expenditureTrends: Array<{ day: string; amount: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const dailyAmount = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.user_id = :userId', { userId })
        .andWhere('booking.pickup_time BETWEEN :dayStart AND :dayEnd', { dayStart, dayEnd })
        .select('COALESCE(SUM(booking.fare), 0)', 'amount')
        .getRawOne();

      expenditureTrends.push({
        day: date.getDate().toString().padStart(2, '0'),
        amount: this.formatCurrency(parseFloat(dailyAmount.amount) || 0),
      });
    }

    return {
      userId,
      totalBookings,
      totalExpenditure: this.formatCurrency(parseFloat(totalExpenditure.total) || 0),
      monthlyStats,
      rideTimeDistribution,
      recentBookings,
      weeklyTrends: {
        currentWeek: currentWeekCount,
        previousWeek: previousWeekCount,
        percentageChange: this.formatPercentage(percentageChange, 1),
      },
      expenditureTrends,
    };
  }

  // Admin Dashboard Analytics
  async getAdminDashboard() {
    const now = new Date();
    
    // System overview
    const totalUsers = await this.userRepository.count();
    const totalDrivers = await this.driverRepository.count();
    const totalBookings = await this.bookingRepository.count();
    
    const totalRevenue = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('COALESCE(SUM(booking.fare), 0)', 'total')
      .getRawOne();

    const activeBookings = await this.bookingRepository.count({
      where: { status: Status.In_progress },
    });

    // Monthly analytics (last 30 days)
    const monthlyAnalytics: Array<{
      day: string;
      income: number;
      expenditure: number;
      profit: number;
      bookingCount: number;
    }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const dailyData = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.pickup_time BETWEEN :dayStart AND :dayEnd', { dayStart, dayEnd })
        .select([
          'COALESCE(SUM(booking.fare), 0) as income',
          'COUNT(booking.id) as bookingCount'
        ])
        .getRawOne();

      monthlyAnalytics.push({
        day: date.getDate().toString().padStart(2, '0'),
        income: this.formatCurrency(parseFloat(dailyData.income)),
        expenditure: this.formatCurrency(parseFloat(dailyData.income) * 0.3),
        profit: this.formatCurrency(parseFloat(dailyData.income) * 0.7),
        bookingCount: parseInt(dailyData.bookingCount),
      });
    }

    // Income distribution
    const totalBookingCount = await this.bookingRepository.count();
    const incomeRanges = [
      { min: 0, max: 2500, range: '2500/-' },
      { min: 2501, max: 3500, range: '2501-3500/-' },
      { min: 3501, max: 5000, range: '3501-5000/-' },
      { min: 5001, max: 999999, range: '5000+/-' },
    ];

    const incomeDistribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }> = [];
    for (const range of incomeRanges) {
      const count = await this.bookingRepository.count({
        where: {
          fare: Between(range.min, range.max),
        },
      });
      incomeDistribution.push({
        range: range.range,
        count,
        percentage: this.formatPercentage(count, totalBookingCount),
      });
    }

    // Ride time analytics
    const bookings = await this.bookingRepository.find();
    const rideTimeAnalytics = {
      morning: { count: 0, percentage: 0 },
      afternoon: { count: 0, percentage: 0 },
      evening: { count: 0, percentage: 0 },
    };

    bookings.forEach(booking => {
      const hour = booking.pickup_time.getHours();
      if (hour >= 6 && hour < 12) rideTimeAnalytics.morning.count++;
      else if (hour >= 12 && hour < 18) rideTimeAnalytics.afternoon.count++;
      else rideTimeAnalytics.evening.count++;
    });

    Object.keys(rideTimeAnalytics).forEach(key => {
      rideTimeAnalytics[key as keyof typeof rideTimeAnalytics].percentage = this.formatPercentage(
        rideTimeAnalytics[key as keyof typeof rideTimeAnalytics].count,
        bookings.length
      );
    });

    // Pending actions
    const pendingDriverVerifications = await this.driverRepository.count({
      where: { verification_status: DriverStatus.Unverified },
    });

    // Weekly revenue
    const weeklyRevenue = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.pickup_time >= :lastWeek', { lastWeek: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) })
      .select('COALESCE(SUM(booking.fare), 0)', 'total')
      .getRawOne();

    const lastWeekRevenue = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.pickup_time BETWEEN :twoWeeksAgo AND :lastWeek', {
        twoWeeksAgo: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        lastWeek: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      })
      .select('COALESCE(SUM(booking.fare), 0)', 'total')
      .getRawOne();

    const revenueTrend = lastWeekRevenue.total > 0 
      ? ((parseFloat(weeklyRevenue.total) - parseFloat(lastWeekRevenue.total)) / parseFloat(lastWeekRevenue.total)) * 100 
      : 0;

    return {
      systemOverview: {
        totalUsers,
        totalDrivers,
        totalBookings,
        totalRevenue: this.formatCurrency(parseFloat(totalRevenue.total)),
        activeBookings,
      },
      monthlyAnalytics,
      incomeDistribution,
      rideTimeAnalytics,
      pendingActions: {
        driverVerifications: pendingDriverVerifications,
        systemMaintenance: 1,
        newDiscounts: 3,
        governmentDeals: 2,
      },
      weeklyRevenue: this.formatCurrency(parseFloat(weeklyRevenue.total)),
      revenueTrend: this.formatPercentage(revenueTrend, 1),
    };
  }

  // Driver Dashboard Analytics
  async getDriverDashboard(driverId: number) {
    const driver = await this.driverRepository.findOne({
      where: { driver_id: driverId },
      relations: ['bookings'] // Add this to load bookings
    });

    if (!driver) {
      throw new HttpException('Driver not found', HttpStatus.NOT_FOUND);
    }

    const vehicle = await this.vehicleRepository.findOne({
      where: { driver: { driver_id: driverId } },
    });

    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Monthly analytics - FIXED QUERY
    const monthlyAnalytics: Array<{
      day: string;
      completedRides: number;
      earnings: number;
      previousWeekRides: number;
    }> = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      // FIX: Use proper relation joins instead of driver_id
      const dailyData = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.driver', 'driver')
        .where('driver.driver_id = :driverId', { driverId })
        .andWhere('booking.pickup_time BETWEEN :dayStart AND :dayEnd', { dayStart, dayEnd })
        .andWhere('booking.status = :status', { status: Status.Completed })
        .select([
          'COALESCE(SUM(booking.fare), 0) as earnings',
          'COUNT(booking.id) as completedRides'
        ])
        .getRawOne();

      const previousWeekData = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.driver', 'driver')
        .where('driver.driver_id = :driverId', { driverId })
        .andWhere('booking.pickup_time BETWEEN :prevWeekStart AND :prevWeekEnd', {
          prevWeekStart: new Date(dayStart.getTime() - 7 * 24 * 60 * 60 * 1000),
          prevWeekEnd: new Date(dayEnd.getTime() - 7 * 24 * 60 * 60 * 1000),
        })
        .andWhere('booking.status = :status', { status: Status.Completed })
        .select('COUNT(booking.id)', 'count')
        .getRawOne();

      monthlyAnalytics.push({
        day: date.getDate().toString().padStart(2, '0'),
        completedRides: parseInt(dailyData.completedRides) || 0, // FIX: Handle null values
        earnings: this.formatCurrency(parseFloat(dailyData.earnings) || 0),
        previousWeekRides: parseInt(previousWeekData.count) || 0,
      });
    }

    // Performance metrics - FIXED QUERY
    const reviews = await this.reviewRepository
      .createQueryBuilder('review')
      .leftJoin('review.booking', 'booking')
      .leftJoin('booking.driver', 'driver')
      .where('driver.driver_id = :driverId', { driverId })
      .getMany();

    const totalRatings = reviews.length;
    const averageRating = totalRatings > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalRatings 
      : 0;

    const performanceMetrics = {
      customerExperience: 85,
      timeConsciousness: 85,
      friendliness: 92,
      overallRating: this.formatCurrency(averageRating),
      totalRatings,
    };

    // Top destinations - FIXED QUERY
    const topDestinations = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.driver', 'driver')
      .where('driver.driver_id = :driverId', { driverId })
      .andWhere('booking.status = :status', { status: Status.Completed })
      .select([
        'booking.end_latitude as lat',
        'booking.end_longitude as lng',
        'COUNT(booking.id) as count',
        'COALESCE(SUM(booking.fare), 0) as totalEarnings'
      ])
      .groupBy('booking.end_latitude, booking.end_longitude')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // Weekly stats - FIXED QUERY
    const weeklyStats = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.driver', 'driver')
      .where('driver.driver_id = :driverId', { driverId })
      .andWhere('booking.pickup_time >= :lastWeek', { lastWeek })
      .andWhere('booking.status = :status', { status: Status.Completed })
      .select([
        'COUNT(booking.id) as totalDrives',
        'COALESCE(SUM(booking.fare), 0) as totalEarnings'
      ])
      .getRawOne();

    const previousWeekStats = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.driver', 'driver')
      .where('driver.driver_id = :driverId', { driverId })
      .andWhere('booking.pickup_time BETWEEN :twoWeeksAgo AND :lastWeek', {
        twoWeeksAgo,
        lastWeek,
      })
      .andWhere('booking.status = :status', { status: Status.Completed })
      .select([
        'COUNT(booking.id) as totalDrives',
        'COALESCE(SUM(booking.fare), 0) as totalEarnings'
      ])
      .getRawOne();

    const percentageChange = (previousWeekStats.totalDrives && parseInt(previousWeekStats.totalDrives) > 0)
      ? ((parseInt(weeklyStats.totalDrives) - parseInt(previousWeekStats.totalDrives)) / parseInt(previousWeekStats.totalDrives)) * 100 
      : 0;

    return {
      driverId,
      vehicle: vehicle ? {
        plateNumber: vehicle.license_plate,
        model: `${vehicle.make} ${vehicle.model}`,
        type: vehicle.type,
      } : null,
      monthlyAnalytics,
      performanceMetrics,
      topDestinations: topDestinations.map(dest => ({
        destination: `Location (${dest.lat}, ${dest.lng})`,
        price: this.formatCurrency(parseFloat(dest.totalEarnings) || 0), // FIX: Handle null
        count: parseInt(dest.count) || 0,
        image: 'https://via.placeholder.com/100',
      })),
      weeklyStats: {
        totalDrives: parseInt(weeklyStats.totalDrives) || 0, // FIX: Handle null
        previousWeek: parseInt(previousWeekStats.totalDrives) || 0,
        percentageChange: this.formatPercentage(percentageChange, 1),
        totalEarnings: this.formatCurrency(parseFloat(weeklyStats.totalEarnings) || 0),
      },
      availability: {
        isAvailable: driver.isAvailable,
        lastActive: new Date(),
      },
    };
  }

  // Analytics Endpoints
  async getBookingAnalytics(startDate: Date, endDate: Date) {
    const bookings = await this.bookingRepository.find({
      where: { pickup_time: Between(startDate, endDate) },
    });

    const totalBookings = bookings.length;
    const revenue = bookings.reduce((sum, booking) => sum + (booking.fare || 0), 0);
    const completedBookings = bookings.filter(b => b.status === Status.Completed).length;
    const cancelledBookings = bookings.filter(b => b.status === Status.Cancelled).length;

    // Peak hours
    const peakHours: Record<number, number> = {};
    bookings.forEach(booking => {
      const hour = booking.pickup_time.getHours();
      peakHours[hour] = (peakHours[hour] || 0) + 1;
    });

    const sortedPeakHours = Object.entries(peakHours)
      .map(([hour, bookings]) => ({ hour: parseInt(hour), bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    return {
      totalBookings,
      revenue: this.formatCurrency(revenue),
      averageFare: this.formatCurrency(totalBookings > 0 ? revenue / totalBookings : 0),
      completionRate: this.formatPercentage(completedBookings, totalBookings),
      cancellationRate: this.formatPercentage(cancelledBookings, totalBookings),
      peakHours: sortedPeakHours,
    };
  }

  async getDriverAnalytics(startDate: Date, endDate: Date) {
    const drivers = await this.driverRepository.find();
    const totalDrivers = drivers.length;

    const activeDrivers = await this.driverRepository
      .createQueryBuilder('driver')
      .innerJoin('driver.bookings', 'booking')
      .where('booking.pickup_time BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();

    const averageRating = await this.reviewRepository
      .createQueryBuilder('review')
      .innerJoin('review.booking', 'booking')
      .where('booking.pickup_time BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select('COALESCE(AVG(review.rating), 0)', 'avgRating')
      .getRawOne();

    const topPerformers = await this.driverRepository
      .createQueryBuilder('driver')
      .leftJoin('driver.bookings', 'booking')
      .where('booking.pickup_time BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select([
        'driver.driver_id as id',
        'driver.rating as rating',
        'COUNT(booking.id) as totalBookings'
      ])
      .groupBy('driver.driver_id')
      .orderBy('totalBookings', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalDrivers,
      activeDrivers,
      averageRating: this.formatCurrency(parseFloat(averageRating.avgRating)),
      topPerformers,
    };
  }

  async getCustomerAnalytics(startDate: Date, endDate: Date) {
    const totalCustomers = await this.userRepository.count();
    
    const activeCustomers = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.bookings', 'booking')
      .where('booking.pickup_time BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();

    const newCustomers = await this.userRepository.count({
      where: { created_at: Between(startDate, endDate) },
    });

    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const retainedCustomers = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.bookings', 'booking1')
      .innerJoin('user.bookings', 'booking2')
      .where('booking1.pickup_time BETWEEN :prevStart AND :prevEnd', { 
        prevStart: previousPeriodStart,
        prevEnd: startDate 
      })
      .andWhere('booking2.pickup_time BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();

    const churnRate = totalCustomers > 0 
      ? ((totalCustomers - activeCustomers) / totalCustomers) * 100 
      : 0;

    return {
      totalCustomers,
      activeCustomers,
      retentionRate: this.formatPercentage(retainedCustomers, activeCustomers),
      newCustomers,
      churnRate: this.formatPercentage(churnRate, 1),
    };
  }

  // Real-time system status
  async getSystemStatus() {
    const activeBookings = await this.bookingRepository.count({
      where: { status: Status.In_progress },
    });

    const availableDrivers = await this.driverRepository.count({
      where: { isAvailable: true },
    });

    return {
      activeBookings,
      availableDrivers,
      systemHealth: 'healthy',
      lastUpdate: new Date().toISOString(),
    };
  }
}
