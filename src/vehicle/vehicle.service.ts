import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehicleRepository.create({
      ...createVehicleDto,
      year: createVehicleDto.year?.toString(),
      capacity: createVehicleDto.capacity?.toString(),
    });
    const saved = await this.vehicleRepository.save(vehicle);
    await this.cacheManager.del('all_vehicles');
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findAll(): Promise<Vehicle[]> {
    const cached = await this.cacheManager.get<Vehicle[]>('all_vehicles');
    if (cached) return cached;
    const vehicles = await this.vehicleRepository.find();
    await this.cacheManager.set('all_vehicles', vehicles);
    return vehicles;
  }

  async findOne(id: number): Promise<Vehicle> {
    const cacheKey = `vehicle_${id}`;
    const cached = await this.cacheManager.get<Vehicle>(cacheKey);
    if (cached) return cached;
    const vehicle = await this.vehicleRepository.findOne({
      where: { vehicle_id: id },
    });
    if (!vehicle)
      throw new NotFoundException(`Vehicle with id ${id} not found`);
    await this.cacheManager.set(cacheKey, vehicle);
    return vehicle;
  }

  async findByDriverId(driver_id: number): Promise<Vehicle[]> {
    const cacheKey = `vehicles_driver_${driver_id}`;
    const cached = await this.cacheManager.get<Vehicle[]>(cacheKey);
    if (cached) return cached;
    const vehicles = await this.vehicleRepository.find({
      where: { driver: { driver_id } },
    });
    await this.cacheManager.set(cacheKey, vehicles);
    return vehicles;
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { vehicle_id: id },
    });
    if (!vehicle)
      throw new NotFoundException(`Vehicle with id ${id} not found`);
    Object.assign(vehicle, updateVehicleDto);
    const updated = await this.vehicleRepository.save(vehicle);
    await this.cacheManager.del('all_vehicles');
    await this.cacheManager.del(`vehicle_${id}`);
    return updated;
  }

  async remove(id: number): Promise<string> {
    const result = await this.vehicleRepository.delete(id);
    await this.cacheManager.del('all_vehicles');
    await this.cacheManager.del(`vehicle_${id}`);
    if (result.affected === 0) {
      return `Vehicle with id ${id} not found`;
    }
    return `Vehicle with id ${id} deleted successfully`;
  }
}
