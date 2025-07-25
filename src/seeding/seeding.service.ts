import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeding, SeedingStatus, SeedingType } from './entities/seeding.entity';
import { User, Role } from 'src/users/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { Status as DriverStatus } from 'src/driver/entities/driver.entity';
import { Location, Label } from 'src/location/entities/location.entity';
import { Booking, Status as BookingStatus } from 'src/bookings/entities/booking.entity';
import { Vehicle } from 'src/vehicle/entities/vehicle.entity';
import { Pricing } from 'src/pricing/entities/pricing.entity';
import { Discount } from 'src/discount/entities/discount.entity';
import { DiscountType, ApplicableTo } from 'src/discount/dto/create-discount.dto';
import { PaymentMethod, methodPay } from 'src/payment-method/entities/payment-method.entity';
import { Review } from 'src/review/entities/review.entity';
import { CreateSeedingDto } from './dto/create-seeding.dto';
import { UpdateSeedingDto } from './dto/update-seeding.dto';
import { SeedUsersDto, SeedDriversDto, SeedVehiclesDto, SeedLocationsDto, SeedBookingsDto, SeedReviewsDto, ClearDataDto } from './dto/seed-specific.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedingService implements OnModuleInit {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Driver) private driverRepository: Repository<Driver>,
    @InjectRepository(Location) private locationRepository: Repository<Location>,
    @InjectRepository(Booking) private bookingRepository: Repository<Booking>,
    @InjectRepository(Vehicle) private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Pricing) private pricingRepository: Repository<Pricing>,
    @InjectRepository(Discount) private discountRepository: Repository<Discount>,
    @InjectRepository(PaymentMethod) private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
  ) {}

  async onModuleInit() {
    try {
      const userCount = await this.userRepository.count();
      if (userCount === 0) {
        this.logger.log('🌱 Database is empty, starting seeding process...');
        await this.seedAll();
        this.logger.log('✅ Database seeded successfully!');
      } else {
        this.logger.log(`📊 Database already contains ${userCount} users, skipping seeding`);
      }
    } catch (error) {
      this.logger.error('❌ Error during seeding:', error);
    }
  }

  async seedAll() {
    try {
      await this.clearAllData();
      
      const users = await this.seedUsers();
      this.logger.log(`📊 After seeding users: ${users.length} users created`);
      
      // Verify users were created
      const userCount = await this.userRepository.count();
      this.logger.log(`📊 Verified user count: ${userCount}`);
      
      const drivers = await this.seedDrivers(users);
      const vehicles = await this.seedVehicles(drivers);
      const locations = await this.seedLocations(users);
      const pricing = await this.seedPricing();
      const discounts = await this.seedDiscounts();
      const paymentMethods = await this.seedPaymentMethods(users);
      const bookings = await this.seedBookings(users, drivers, pricing, discounts);
      await this.seedReviews(bookings);
      
      this.logger.log('🎯 All seeding completed successfully!');
    } catch (error) {
      this.logger.error('❌ Error in seedAll:', error);
      throw error;
    }
  }

  private async clearAllData() {
    this.logger.log('🧹 Clearing existing data...');
    
    try {
      // Get the query runner to manage transactions and constraints
      const queryRunner = this.userRepository.manager.connection.createQueryRunner();
      
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      try {
        // Disable foreign key constraints temporarily
        await queryRunner.query(`SET session_replication_role = 'replica';`);
        
        // Clear tables in reverse dependency order to avoid foreign key violations
        await queryRunner.query(`DELETE FROM "review";`);
        await queryRunner.query(`DELETE FROM "booking";`);
        await queryRunner.query(`DELETE FROM "payment_method";`);
        await queryRunner.query(`DELETE FROM "discount";`);
        await queryRunner.query(`DELETE FROM "pricing";`);
        await queryRunner.query(`DELETE FROM "locations";`);
        await queryRunner.query(`DELETE FROM "vehicle";`);
        await queryRunner.query(`DELETE FROM "driver";`);
        await queryRunner.query(`DELETE FROM "user";`);
        
        // Re-enable foreign key constraints
        await queryRunner.query(`SET session_replication_role = 'origin';`);
        
        await queryRunner.commitTransaction();
        this.logger.log('✅ All data cleared successfully with constraints handled');
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error('❌ Error clearing data:', error);
      throw new Error(`Failed to clear data: ${error.message}`);
    }
  }

  private async seedUsers() {
  this.logger.log('👥 Seeding 500 customers & 500 drivers...');

  const salt = await bcrypt.genSalt(10);
  const createdUsers: User[] = [];

  for (let i = 1; i <= 500; i++) {
    const customer = this.userRepository.create({
      firstName: `Customer${i}`,
      lastName: `Lastname${i}`,
      email: `customer${i}@example.com`,
      password: await bcrypt.hash(`password${i}`, salt),
      phone: `+254700000${String(i).padStart(3, '0')}`,
      role: Role.CUSTOMER,
    });
    createdUsers.push(await this.userRepository.save(customer));

    const driver = this.userRepository.create({
      firstName: `Driver${i}`,
      lastName: `Lastname${i}`,
      email: `driver${i}@example.com`,
      password: await bcrypt.hash(`password${i}`, salt),
      phone: `+254711000${String(i).padStart(3, '0')}`,
      role: Role.DRIVER,
    });
    createdUsers.push(await this.userRepository.save(driver));
  }

  this.logger.log(`✅ Created ${createdUsers.length} users`);
  return createdUsers;
}


  private async seedDrivers(users: User[]) {
    this.logger.log('🚗 Seeding 500 drivers...');

    const driverUsers = users.filter(u => u.role === Role.DRIVER);
    const createdDrivers: Driver[] = [];

    for (let i = 0; i < driverUsers.length; i++) {
      const user = driverUsers[i];
      const driver = this.driverRepository.create({
        userId: user.userId, // Link driver to user via userId
        license_number: 100000 + i,
        rating: 3 + Math.random() * 2,
        verification_status: DriverStatus.Verified,
        total_trips: Math.floor(Math.random() * 500),
        isAvailable: Math.random() > 0.2,
        latitude: -1.2 + Math.random() * 0.1,
        longitude: 36.8 + Math.random() * 0.1,
      });
      createdDrivers.push(await this.driverRepository.save(driver));
    }

    this.logger.log(`✅ Created ${createdDrivers.length} drivers`);
    return createdDrivers;
  }


private async seedVehicles(drivers: Driver[]) {
  this.logger.log('🚙 Seeding 500 vehicles...');

  const vehicleMakes = ['Toyota', 'Honda', 'Nissan', 'Subaru', 'Mazda'];
  const colors = ['White', 'Black', 'Blue', 'Red', 'Silver'];

  const createdVehicles: Vehicle[] = [];

  for (let i = 0; i < drivers.length; i++) {
    const vehicle = this.vehicleRepository.create({
      driver: drivers[i],
      make: vehicleMakes[i % vehicleMakes.length],
      model: `Model${i}`,
      year: `20${20 + (i % 5)}`,
      license_plate: `K${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 1) % 26))} ${1000 + i}`,
      color: colors[i % colors.length],
      capacity: '4',
      type: 'Sedan',
      approved: true,
    });
    createdVehicles.push(await this.vehicleRepository.save(vehicle));
  }

  this.logger.log(`✅ Created ${createdVehicles.length} vehicles`);
  return createdVehicles;
}


private async seedLocations(users: User[]) {
  this.logger.log('📍 Seeding up to 500 locations...');

  const customerUsers = users.filter(u => u.role === Role.CUSTOMER);
  const createdLocations: Location[] = [];

  for (const customer of customerUsers) {
    const numLocations = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < numLocations; j++) {
      const location = this.locationRepository.create({
        user: customer,
        latitude: 36.8 + Math.random() * 0.1,
        longitude: 1.2 + Math.random() * 0.1,
        address: `Random St ${j} for ${customer.firstName}`,
        label: Label.HOME,
        is_default: j === 0,
      });
      createdLocations.push(await this.locationRepository.save(location));
    }
  }

  this.logger.log(`✅ Created ${createdLocations.length} locations`);
  return createdLocations;
}


  private async seedPricing() {
    this.logger.log('💰 Seeding pricing...');
    
    const pricing = [
      { basefare: 100, cost_per_km: 50, cost_per_minute: 10, service_fee: 20, minimum_fare: 150, conditions_multiplier: 1.0 },
      { basefare: 150, cost_per_km: 60, cost_per_minute: 15, service_fee: 30, minimum_fare: 200, conditions_multiplier: 1.2 },
      { basefare: 200, cost_per_km: 70, cost_per_minute: 20, service_fee: 40, minimum_fare: 250, conditions_multiplier: 1.5 },
    ];

    const createdPricing: Pricing[] = [];
    for (const pricingData of pricing) {
      const pricingEntity = this.pricingRepository.create(pricingData);
      const savedPricing = await this.pricingRepository.save(pricingEntity);
      createdPricing.push(savedPricing);
    }
    
    this.logger.log(`✅ Created ${createdPricing.length} pricing tiers`);
    return createdPricing;
  }

  private async seedDiscounts() {
    this.logger.log('🎫 Seeding discounts...');
    
    const discounts = [
      { code: 'WELCOME10', discount_type: DiscountType.PERCENTAGE, discount_value: 10, expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), maximum_uses: 100, current_uses: 0, applicableTo: ApplicableTo.ALL_USERS },
      { code: 'FIRST50', discount_type: DiscountType.FIXED, discount_value: 50, expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), maximum_uses: 50, current_uses: 0, applicableTo: ApplicableTo.ALL_USERS },
      { code: 'RIDE20', discount_type: DiscountType.PERCENTAGE, discount_value: 20, expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), maximum_uses: 200, current_uses: 0, applicableTo: ApplicableTo.ALL_USERS },
      { code: 'WEEKEND30', discount_type: DiscountType.PERCENTAGE, discount_value: 30, expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), maximum_uses: 100, current_uses: 0, applicableTo: ApplicableTo.ALL_USERS },
    ];

    const createdDiscounts: Discount[] = [];
    for (const discountData of discounts) {
      const discount = this.discountRepository.create(discountData);
      const savedDiscount = await this.discountRepository.save(discount);
      createdDiscounts.push(savedDiscount);
    }
    
    this.logger.log(`✅ Created ${createdDiscounts.length} discounts`);
    return createdDiscounts;
  }

  private async seedPaymentMethods(users: User[]) {
    this.logger.log('💳 Seeding payment methods...');
    
    const customerUsers = users.filter(u => u.role === Role.CUSTOMER);
    const createdPaymentMethods: PaymentMethod[] = [];

    for (const user of customerUsers) {

      const paypalPayment = this.paymentMethodRepository.create({
        user,
        payment_type: methodPay.PAYPAL,
        amount: Math.floor(Math.random() * 3000) + 500,
        is_default: false,
      });
      const savedPaypal = await this.paymentMethodRepository.save(paypalPayment);
      createdPaymentMethods.push(savedPaypal);
    }
    
    this.logger.log(`✅ Created ${createdPaymentMethods.length} payment methods`);
    return createdPaymentMethods;
  }

  private async seedBookings(
  users: User[],
  drivers: Driver[],
  pricing: Pricing[],
  discounts: Discount[],
) {
  this.logger.log('🚕 Seeding 6 months of historical bookings...');

  const customerUsers = users.filter(u => u.role === Role.CUSTOMER);
  const availableDrivers = drivers.filter(d => d.isAvailable);
  const createdBookings: Booking[] = [];

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 6 months ago

  for (const customer of customerUsers) {
    const numBookings = 5 + Math.floor(Math.random() * 15);
    
    for (let i = 0; i < numBookings; i++) {
      const driver = availableDrivers[Math.floor(Math.random() * availableDrivers.length)];
      const priceTier = pricing[Math.floor(Math.random() * pricing.length)];
      const discount = Math.random() < 0.3 ? discounts[Math.floor(Math.random() * discounts.length)] : null;

      const randomDays = Math.floor(Math.random() * 180); // 0-180 days ago
      const bookingDate = new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
      
      const hour = 6 + Math.floor(Math.random() * 18); // 6 AM to midnight
      const minute = Math.floor(Math.random() * 60);
      bookingDate.setHours(hour, minute, 0, 0);

      const duration = 600 + Math.floor(Math.random() * 3000);
      
      const fare = 200 + Math.floor(Math.random() * 1800);
      
      const distance = 1000 + Math.floor(Math.random() * 14000);

      // Random status distribution
      const statuses = [BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.In_progress];
      const weights = [0.7, 0.2, 0.1]; // 70% completed, 20% cancelled, 10% in progress
      const random = Math.random();
      let status = BookingStatus.Completed;
      let cumulative = 0;
      for (let j = 0; j < statuses.length; j++) {
        cumulative += weights[j];
        if (random <= cumulative) {
          status = statuses[j];
          break;
        }
      }

      let dropoffTime = new Date(bookingDate.getTime() + duration * 1000);
      if (status === BookingStatus.Cancelled) {
        dropoffTime = new Date(bookingDate.getTime() + Math.floor(Math.random() * 300) * 1000); // Cancelled within 5 minutes
      }

      const booking = this.bookingRepository.create({
        user: customer,
        driver: driver,
        start_latitude: 36.8 + Math.random() * 0.1,
        start_longitude: -1.2 + Math.random() * 0.1,
        end_latitude: 36.8 + Math.random() * 0.1,
        end_longitude: -1.2 + Math.random() * 0.1,
        pickup_time: bookingDate,
        dropoff_time: dropoffTime,
        status: status,
        fare: fare,
        distance: distance,
        duration: duration,
        pricing: priceTier,
        discount: discount || undefined,
      });

      createdBookings.push(await this.bookingRepository.save(booking));
    }
  }

  this.logger.log(`✅ Created ${createdBookings.length} historical bookings over 6 months`);
  return createdBookings;
}


private async seedReviews(bookings: Booking[]) {
  this.logger.log('⭐ Seeding reviews for completed bookings...');

  const completedBookings = bookings.filter(b => b.status === BookingStatus.Completed);
  const createdReviews: Review[] = [];

  for (const booking of completedBookings) {
    if (Math.random() < 0.8) {
      const review = this.reviewRepository.create({
        booking: booking,
        rating: Math.floor(3 + Math.random() * 2), 
        comment: `Ride was ${['great', 'good', 'okay', 'excellent'][Math.floor(Math.random() * 4)]}!`,
      });
      createdReviews.push(await this.reviewRepository.save(review));
    }
  }

  this.logger.log(`✅ Created ${createdReviews.length} reviews`);
  return createdReviews;
}


  // Additional methods for manual seeding
  async seedUsersOnly() {
    return await this.seedUsers();
  }

  async seedDriversOnly(users: User[]) {
    return await this.seedDrivers(users);
  }

  async seedVehiclesOnly(drivers: Driver[]) {
    return await this.seedVehicles(drivers);
  }

  async seedLocationsOnly(users: User[]) {
    return await this.seedLocations(users);
  }

  async seedBookingsOnly(users: User[], drivers: Driver[], pricing: Pricing[], discounts: Discount[]) {
    return await this.seedBookings(users, drivers, pricing, discounts);
  }

  async getSeedingStats() {
    return {
      users: await this.userRepository.count(),
      drivers: await this.driverRepository.count(),
      vehicles: await this.vehicleRepository.count(),
      locations: await this.locationRepository.count(),
      bookings: await this.bookingRepository.count(),
      reviews: await this.reviewRepository.count(),
      pricing: await this.pricingRepository.count(),
      discounts: await this.discountRepository.count(),
      paymentMethods: await this.paymentMethodRepository.count(),
    };
  }
}
