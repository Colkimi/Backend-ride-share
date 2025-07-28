import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  ParseIntPipe,
  Query 
} from '@nestjs/common';
import { RideshareService } from './rideshare.service';
import { CreateRideshareDto } from './dto/create-rideshare.dto';
import { UpdateRideshareDto } from './dto/update-rideshare.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { AvailableRideDto } from './dto/available-rides.dto';
import { RideshareResponseDto } from './dto/rideshare-response.dto';
import { AtGuard } from '../auth/guards/at.guard';

@Controller('rideshare')
@UseGuards(AtGuard)
export class RideshareController {
  constructor(private readonly rideshareService: RideshareService) {}

  @Post('search')
  async searchAvailableRides(
    @Request() req,
    @Body() searchDto: SearchRidesDto,
  ): Promise<AvailableRideDto[]> {
    const userId = req.user.userId;
    return this.rideshareService.searchAvailableRides(userId, searchDto);
  }

  @Post()
  async create(
    @Request() req,
    @Body() createRideshareDto: CreateRideshareDto,
  ): Promise<RideshareResponseDto> {
    const userId = req.user.userId;
    return this.rideshareService.create(userId, createRideshareDto);
  }

  @Get()
  async findAll(): Promise<RideshareResponseDto[]> {
    return this.rideshareService.findAll();
  }

  @Get('my-rideshares')
  async findUserRideshares(@Request() req): Promise<RideshareResponseDto[]> {
    const userId = req.user.userId;
    return this.rideshareService.findUserRideshares(userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RideshareResponseDto> {
    return this.rideshareService.findOne(id);
  }

  @Post(':id/accept')
  async acceptRideshareRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes?: string,
  ): Promise<RideshareResponseDto> {
    const userId = req.user.userId;
    return this.rideshareService.acceptRideshareRequest(userId, id, notes);
  }

  @Post(':id/decline')
  async declineRideshareRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes?: string,
  ): Promise<RideshareResponseDto> {
    const userId = req.user.userId;
    return this.rideshareService.declineRideshareRequest(userId, id, notes);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateRideshareDto: UpdateRideshareDto
  ): Promise<RideshareResponseDto> {
    return this.rideshareService.update(id, updateRideshareDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.rideshareService.remove(id);
    return { message: `Rideshare with id ${id} has been removed` };
  }
}
