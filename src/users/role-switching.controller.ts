import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RoleSwitchingService, RoleSwitchResponseDto } from './role-switching.service';
import { GetCurrentUserId } from 'src/auth/decorators';
import { AtGuard, RolesGuard } from 'src/auth/guards';
import { Roles } from 'src/auth/decorators';
import { Role } from './entities/user.entity';

@ApiTags('role-switching')
@Controller('users/role')
@UseGuards(AtGuard, RolesGuard)
export class RoleSwitchingController {
  constructor(private readonly roleSwitchingService: RoleSwitchingService) {}

  @Roles(Role.CUSTOMER, Role.DRIVER, Role.ADMIN)
  @Post('switch-to-driver')
  @ApiOperation({ 
    summary: 'Switch user role to driver',
    description: 'Allows a user to switch to driver mode if they have a complete driver profile'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Role switched successfully or setup required'
  })
  async switchToDriver(@GetCurrentUserId() userId: number): Promise<RoleSwitchResponseDto> {
    return this.roleSwitchingService.switchToDriver(userId);
  }

  @Roles(Role.DRIVER, Role.CUSTOMER, Role.ADMIN)
  @Post('switch-to-customer')
  @ApiOperation({ 
    summary: 'Switch user role to customer',
    description: 'Allows a driver to switch to customer mode'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Role switched successfully'
  })
  async switchToCustomer(@GetCurrentUserId() userId: number): Promise<RoleSwitchResponseDto> {
    return this.roleSwitchingService.switchToCustomer(userId);
  }

  @Roles(Role.CUSTOMER, Role.DRIVER, Role.ADMIN)
  @Get('current')
  @ApiOperation({ 
    summary: 'Get current user role information',
    description: 'Returns current role and available role switching options'
  })
  async getCurrentRole(@GetCurrentUserId() userId: number) {
    return this.roleSwitchingService.getCurrentRole(userId);
  }

  @Roles(Role.CUSTOMER, Role.ADMIN)
  @Post('enable-driver')
  @ApiOperation({ 
    summary: 'Enable driver mode for customer',
    description: 'Enables driver capabilities for a customer account'
  })
  async enableDriverMode(@GetCurrentUserId() userId: number): Promise<RoleSwitchResponseDto> {
    return this.roleSwitchingService.enableDriverMode(userId);
  }
}