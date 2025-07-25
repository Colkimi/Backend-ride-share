import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const ParseFloat = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    const value = request.query[data as string];
    
    if (value === undefined) {
      throw new BadRequestException(`${data as string} is required`);
    }
    
    const parsed = parseFloat(value);
    
    if (isNaN(parsed)) {
      throw new BadRequestException(`${data as string} must be a number`);
    }
    
    return parsed;
  },
);