import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from './entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { Booking, Status } from 'src/bookings/entities/booking.entity';

export interface RoleSwitchResponseDto {
  success: boolean;
  previousRole: Role;
  newRole: Role;
  message: string;
  driverProfile?: any;
  requiresDriverSetup?: boolean;
  availableRoles?: Role[];
}

@Injectable()
export class RoleSwitchingService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async switchToDriver(userId: number): Promise<RoleSwitchResponseDto> {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['driver']
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Check if user is already in driver mode
    if (user.activeRole === Role.DRIVER) {
      return {
        success: false,
        previousRole: user.activeRole,
        newRole: Role.DRIVER,
        message: 'You are already in driver mode',
        availableRoles: user.availableRoles || [Role.CUSTOMER],
      };
    }

    // Check if user has driver profile
    let driverProfile = await this.driverRepository.findOne({
      where: { user: { userId } },
      relations: ['user', 'vehicle']
    });

    if (!driverProfile) {
      // Enable driver capabilities for this user
      user.availableRoles = [Role.CUSTOMER, Role.DRIVER];
      user.isDriverEligible = true;
      user.activeRole = Role.CUSTOMER; // Keep as customer until driver setup is complete
      await this.userRepository.save(user);

      return {
        success: true,
        previousRole: Role.CUSTOMER,
        newRole: Role.CUSTOMER,
        message: 'Driver profile setup required. Please complete driver registration.',
        requiresDriverSetup: true,
        availableRoles: [Role.CUSTOMER, Role.DRIVER],
      };
    }

    // Check if driver profile is complete and verified
    if (!this.isDriverProfileComplete(driverProfile)) {
      return {
        success: false,
        previousRole: user.activeRole || Role.CUSTOMER,
        newRole: Role.CUSTOMER,
        message: 'Please complete your driver profile before switching to driver mode',
        requiresDriverSetup: true,
        availableRoles: user.availableRoles || [Role.CUSTOMER, Role.DRIVER],
      };
    }

    // Switch to driver mode
    const previousRole = user.activeRole || Role.CUSTOMER;
    user.activeRole = Role.DRIVER;
    user.availableRoles = [Role.CUSTOMER, Role.DRIVER];
    user.isDriverEligible = true;
    await this.userRepository.save(user);

    return {
      success: true,
      previousRole,
      newRole: Role.DRIVER,
      message: 'Successfully switched to driver mode',
      availableRoles: [Role.CUSTOMER, Role.DRIVER],
      driverProfile: {
        driverId: driverProfile.driver_id,
        isAvailable: driverProfile.isAvailable,
        rating: driverProfile.rating,
        verification_status: driverProfile.verification_status,
        vehicle: driverProfile.vehicles
      },
    };
  }

  async switchToCustomer(userId: number): Promise<RoleSwitchResponseDto> {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['driver']
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    if (user.activeRole === Role.CUSTOMER) {
      return {
        success: false,
        previousRole: user.activeRole,
        newRole: Role.CUSTOMER,
        message: 'You are already in customer mode',
        availableRoles: user.availableRoles || [Role.CUSTOMER],
      };
    }

    // Check if driver has active bookings
    if (user.driver) {
      if (typeof user.driver.driver_id === 'number') {
        const hasActiveBookings = await this.hasActiveDriverBookings(user.driver.driver_id);
        if (hasActiveBookings) {
          throw new BadRequestException('Cannot switch to customer mode while you have active bookings as a driver');
        }
      } else {
        throw new BadRequestException('Driver profile is missing a valid driver_id');
      }

      // Set driver as unavailable
      user.driver.isAvailable = false;
      await this.driverRepository.save(user.driver);
    }

    const previousRole = user.activeRole || Role.DRIVER;
    user.activeRole = Role.CUSTOMER;
    await this.userRepository.save(user);

    return {
      success: true,
      previousRole,
      newRole: Role.CUSTOMER,
      message: 'Successfully switched to customer mode',
      availableRoles: user.availableRoles || [Role.CUSTOMER, Role.DRIVER],
    };
  }

  async getCurrentRole(userId: number): Promise<{ 
    role: Role; 
    activeRole: Role; 
    availableRoles: Role[];
    canSwitchToDriver: boolean; 
    canSwitchToCustomer: boolean;
    requiresDriverSetup: boolean;
  }> {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['driver']
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const availableRoles = user.availableRoles || [user.role];
    const activeRole = user.activeRole || user.role;
    const hasDriverProfile = !!user.driver;
    const isDriverComplete = hasDriverProfile && user.driver ? this.isDriverProfileComplete(user.driver) : false;

    const canSwitchToDriver = availableRoles.includes(Role.DRIVER) && isDriverComplete;
    const canSwitchToCustomer = availableRoles.includes(Role.CUSTOMER) && activeRole === Role.DRIVER;
    const requiresDriverSetup = availableRoles.includes(Role.DRIVER) && !isDriverComplete;

    return {
      role: user.role,
      activeRole,
      availableRoles,
      canSwitchToDriver,
      canSwitchToCustomer,
      requiresDriverSetup,
    };
  }

  async enableDriverMode(userId: number): Promise<RoleSwitchResponseDto> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const currentAvailableRoles = user.availableRoles || [user.role];
    
    if (currentAvailableRoles.includes(Role.DRIVER)) {
      return {
        success: false,
        previousRole: user.activeRole || user.role,
        newRole: user.activeRole || user.role,
        message: 'Driver mode is already enabled for this account',
        availableRoles: currentAvailableRoles,
      };
    }

    user.availableRoles = [...currentAvailableRoles, Role.DRIVER];
    user.isDriverEligible = true;
    await this.userRepository.save(user);

    return {
      success: true,
      previousRole: user.activeRole || user.role,
      newRole: user.activeRole || user.role,
      message: 'Driver mode enabled. You can now switch between customer and driver roles.',
      requiresDriverSetup: !user.driver,
      availableRoles: user.availableRoles,
    };
  }

  private isDriverProfileComplete(driver: Driver): boolean {
    return !!(
      driver.verification_status === 'verified' &&
      driver.license_number &&
      driver.vehicles 
    );
  }

  private async hasActiveDriverBookings(driverId: number): Promise<boolean> {
    const activeStatuses = [Status.Requested, Status.Accepted, Status.In_progress];
    
    const activeBooking = await this.bookingRepository.findOne({
      where: { 
        driver: { driver_id: driverId },
        status: activeStatuses as any
      }
    });
    
    return !!activeBooking;
  }
}