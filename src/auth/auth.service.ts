import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAuthDto } from './dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Helper method to generates access and refresh tokens for the user
  private async getTokens(userId: number, email: string, role: string) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email: email,
          role: role,
        },
        {
          secret: this.configService.getOrThrow<string>(
            'JWT_ACCESS_TOKEN_SECRET',
          ),
          expiresIn: this.configService.getOrThrow<string>(
            'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
          ), // 15 minutes
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email: email,
          role: role,
        },
        {
          secret: this.configService.getOrThrow<string>(
            'JWT_REFRESH_TOKEN_SECRET',
          ),
          expiresIn: this.configService.getOrThrow<string>(
            'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
          ), // 60, "2 days", "10h", "7d"
        },
      ),
    ]);
    return { accessToken: at, refreshToken: rt,  };
  }

  // Helper method to hashes the password using bcrypt
  private async hashData(data: string): Promise<string> {
    const salt = await Bcrypt.genSalt(10);
    return await Bcrypt.hash(data, salt);
  }

  // Helper method to remove password from profile
  private async saveRefreshToken(userId: number, refreshToken: string) {
    // hash refresh token
    const hashedRefreshToken = await this.hashData(refreshToken);
    // save hashed refresh token in the database
    await this.userRepository.update(userId, {
      hashedRefreshToken: hashedRefreshToken,
    });
  }

  
  // Method to sign in the user
  async signIn(createAuthDto: CreateAuthDto) {
    // check if the user exists in the database
    const foundUser = await this.userRepository.findOne({
      where: { email: createAuthDto.email },
      select: ['userId', 'email', 'password', 'role', 'phone', 'firstName', 'lastName'], // Include role in selection
    });
    if (!foundUser) {
      throw new NotFoundException(
        `User with email ${createAuthDto.email} not found`,
      );
    }
    // compare hashed password with the password provided
    const foundPassword = await Bcrypt.compare(
      createAuthDto.password,
      foundUser.password,
    );
    if (!foundPassword) {
      throw new NotFoundException('Invalid credentials');
    }
    // if correct generate tokens
    const { accessToken, refreshToken } = await this.getTokens(
      foundUser.userId,
      foundUser.email,
      foundUser.role,
    );

    // save refresh token in the database
    await this.saveRefreshToken(foundUser.userId, refreshToken);
    // return the tokens and user details
    return {
      accessToken,
      refreshToken,
      user: {
        userId: foundUser.userId,
        email: foundUser.email,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        phone: foundUser.phone,
        role: foundUser.role,
      },
    };
  }

  // Method to sign out the user
  async signOut(userId: string) {
    // set user refresh token to null
    const res = await this.userRepository.update(userId, {
      hashedRefreshToken: null,
    });

    if (res.affected === 0) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return { message: `User with id : ${userId} signed out successfully` };
  }

  // Method to refresh tokens
  async refreshTokens(id: number, refreshToken: string) {
    // get user
    const foundUser = await this.userRepository.findOne({
      where: { userId: id },
      select: ['userId', 'email', 'role', 'hashedRefreshToken'], // Include role in selection
    });

    if (!foundUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (!foundUser.hashedRefreshToken) {
      throw new NotFoundException('No refresh token found');
    }

    // check if the refresh token is valid
    const refreshTokenMatches = await Bcrypt.compare(
      refreshToken,
      foundUser.hashedRefreshToken,
    );

    if (!refreshTokenMatches) {
      throw new NotFoundException('Invalid refresh token');
    }
    // generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await this.getTokens(
      foundUser.userId,
      foundUser.email,
      foundUser.role,
    );
    // save new refresh token in the database
    await this.saveRefreshToken(foundUser.userId, newRefreshToken);
    // return the new tokens
    return { accessToken, refreshToken: newRefreshToken };
  }

  async signup(createUserDto: CreateUserDto): Promise<any> {
    // hash the password
    const hashedPassword = await this.hashData(createUserDto.password);
    // create the new user
    const newUser = await this.userRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      password: hashedPassword,
      role: createUserDto.role,
    });
    // save the new user in the database
    await this.userRepository.save(newUser);
    return { message: 'User created successfully' };
  }
}
