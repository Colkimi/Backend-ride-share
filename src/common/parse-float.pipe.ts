import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseFloatPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    if (value === undefined || value === '') {
      throw new BadRequestException(`${metadata.data} is required`);
    }
    const val = parseFloat(value);
    if (isNaN(val)) {
      throw new BadRequestException(`${metadata.data} must be a valid number`);
    }
    return val;
  }
}