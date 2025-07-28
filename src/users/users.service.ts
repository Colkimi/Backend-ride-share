import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User, Role } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as Bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  private async hashData(data: string): Promise<string> {
    const salt = await Bcrypt.genSalt(10);
    return await Bcrypt.hash(data, salt);
  }

  private excludePassword(user: User): Partial<User> {
    const { password, ...rest } = user;
    return rest;
  }

  async create(createUserDto: CreateUserDto): Promise<Partial<User>> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
      select: ['userId'],
    });
    if (existingUser) {
      throw new Error(`User with email ${createUserDto.email} already exists`);
    }
    const newUser = {
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      phone: createUserDto.phone,
      password: await this.hashData(createUserDto.password),
      role: createUserDto.role || Role.CUSTOMER,
      activeRole: createUserDto.role || Role.CUSTOMER, // Set initial active role
      availableRoles: [createUserDto.role || Role.CUSTOMER], // Set initial available roles
      isDriverEligible: false,
    };

    const savedUser = await this.userRepository
      .save(newUser)
      .then((user) => {
        return user;
      })
      .catch((error) => {
        console.error('Error creating user:', error);
        throw new Error('Failed to create user');
      });

    return this.excludePassword(savedUser);
  }

  async findAll(email?: string): Promise<Partial<User>[]> {
    let users: User[];
    if (email) {
      users = await this.userRepository.find({
        where: {
          email: email,
        },
        select: ['userId', 'firstName', 'lastName', 'email', 'phone', 'role', 'activeRole', 'availableRoles', 'isDriverEligible'],
      });
    } else {
      users = await this.userRepository.find({
        select: ['userId', 'firstName', 'lastName', 'email', 'phone', 'role', 'activeRole', 'availableRoles', 'isDriverEligible'],
      });
    }

    return users.map((user) => this.excludePassword(user));
  }

  async findOne(id: number): Promise<User> {
    const res = await this.userRepository.findOneBy({ userId: id });
    if (!res) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return res;
  }

  // New method to get user with role information
  async findOneWithRoles(id: number): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { userId: id },
      select: ['userId', 'firstName', 'lastName', 'email', 'phone', 'role', 'activeRole', 'availableRoles', 'isDriverEligible'],
      relations: ['driver']
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<Partial<User> | string> {
    if (updateUserDto.password) {
      updateUserDto.password = await this.hashData(updateUserDto.password);
    }

    await this.userRepository.update(id, updateUserDto);

    return await this.findOne(id);
  }

  async remove(id: number): Promise<string> {
    return await this.userRepository
      .delete(id)
      .then((result) => {
        if (result.affected === 0) {
          return `No user found with id ${id}`;
        }
        return `User with id ${id} has been removed`;
      })
      .catch((error) => {
        console.error('Error removing user:', error);
        throw new Error(`Failed to remove user with id ${id}`);
      });
  }
}
