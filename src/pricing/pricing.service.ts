import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { Pricing } from './entities/pricing.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(Pricing)
    private readonly pricingRepository: Repository<Pricing>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createPricingDto: CreatePricingDto): Promise<Pricing> {
    const pricing = this.pricingRepository.create(createPricingDto);
    const saved = await this.pricingRepository.save(pricing);
    await this.cacheManager.del('all_pricing');
    return saved;
  }

  async findAll(): Promise<Pricing[]> {
    const cached = await this.cacheManager.get<Pricing[]>('all_pricing');
    if (cached) return cached;
    const pricing = await this.pricingRepository.find();
    await this.cacheManager.set('all_pricing', pricing);
    return pricing;
  }

  async findOne(id: number): Promise<Pricing> {
    const cacheKey = `pricing_${id}`;
    const cached = await this.cacheManager.get<Pricing>(cacheKey);
    if (cached) return cached;
    const pricing = await this.pricingRepository.findOneBy({ id });
    if (!pricing) {
      throw new NotFoundException(`Pricing with ID ${id} not found`);
    }
    await this.cacheManager.set(cacheKey, pricing);
    return pricing;
  }

  async update(
    id: number,
    updatePricingDto: UpdatePricingDto,
  ): Promise<Pricing> {
    const pricing = await this.findOne(id);
    Object.assign(pricing, updatePricingDto);
    const updated = await this.pricingRepository.save(pricing);
    await this.cacheManager.del('all_pricing');
    await this.cacheManager.del(`pricing_${id}`);
    return updated;
  }

  async remove(id: number): Promise<string> {
    const result = await this.pricingRepository.delete(id);
    await this.cacheManager.del('all_pricing');
    await this.cacheManager.del(`pricing_${id}`);
    if (result.affected === 0) {
      throw new NotFoundException(`Pricing with ID ${id} not found`);
    }
    return `Pricing with ID ${id} deleted successfully`;
  }
}
