import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { AtGuard, RolesGuard } from 'src/auth/guards';
import { Role } from 'src/users/entities/user.entity';
import { Roles } from 'src/auth/decorators';
import { Request } from 'express';

declare module 'express' {
  interface Request {
    user?: any;
  }
}

@ApiTags('vehicle')
@Controller('vehicle')
@UseGuards(AtGuard, RolesGuard)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Roles(Role.ADMIN, Role.DRIVER)
  @Post()
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehicleService.create(createVehicleDto);
  }

  @ApiQuery({
    name: 'make',
    required: false,
    description: 'search by vehicle make',
    example: 'Toyota',
  })
  @ApiQuery({
    name: 'model',
    required: false,
    description: 'search by vehicle model',
    example: 'Corolla',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'search by vehicle type',
    example: 'standard',
  })
  @Get()
  findAll(
    @Query('make') make: string,
    @Query('model') model: string,
    @Query('make') type: string,
  ) {
    return this.vehicleService.findAll();
  }

  @Roles(Role.ADMIN, Role.DRIVER)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Req() req: Request,
  ) {
    const user = req.user as { role: Role };
    if (user && user.role === Role.DRIVER && updateVehicleDto.approved) {
      throw new ForbiddenException(
        ' Drivers are not allowed to change the approval status.',
      );
    }
    (updateVehicleDto as any).id = id;
    return this.vehicleService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.remove(id);
  }
}
