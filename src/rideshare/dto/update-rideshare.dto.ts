import { PartialType } from '@nestjs/swagger';
import { CreateRideshareDto } from './create-rideshare.dto';

export class UpdateRideshareDto extends PartialType(CreateRideshareDto) {}
