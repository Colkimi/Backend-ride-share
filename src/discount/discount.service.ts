import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { Discount } from './entities/discount.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class DiscountService {
  constructor(
    @InjectRepository(Discount)
    private readonly discountRepository: Repository<Discount>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createDiscountDto: CreateDiscountDto): Promise<Discount> {
    const discount = this.discountRepository.create(createDiscountDto);
    const saved = await this.discountRepository.save(discount);
    await this.cacheManager.del('all_discounts');
    return saved;
  }

  async findAll(): Promise<Discount[]> {
    const cached = await this.cacheManager.get<Discount[]>('all_discounts');
    if (cached) return cached;
    const discounts = await this.discountRepository.find();
    await this.cacheManager.set('all_discounts', discounts);
    return discounts;
  }

  async findOne(id: number): Promise<Discount> {
    const cacheKey = `discount_${id}`;
    const cached = await this.cacheManager.get<Discount>(cacheKey);
    if (cached) return cached;
    const discount = await this.discountRepository.findOneBy({ id });
    if (!discount) {
      throw new NotFoundException(`Discount with ID ${id} not found`);
    }
    await this.cacheManager.set(cacheKey, discount);
    return discount;
  }

  async update(
    id: number,
    updateDiscountDto: UpdateDiscountDto,
  ): Promise<Discount> {
    const discount = await this.findOne(id);
    Object.assign(discount, updateDiscountDto);
    const updated = await this.discountRepository.save(discount);
    await this.cacheManager.del('all_discounts');
    await this.cacheManager.del(`discount_${id}`);
    return updated;
  }

  async remove(id: number): Promise<string> {
    const result = await this.discountRepository.delete(id);
    await this.cacheManager.del('all_discounts');
    await this.cacheManager.del(`discount_${id}`);
    if (result.affected === 0) {
      throw new NotFoundException(`Discount with ID ${id} not found`);
    }
    return `Discount with ID ${id} deleted successfully`;
  }
}
