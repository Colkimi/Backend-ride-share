import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ContextMessage {
  @ApiProperty({ example: 'user' })
  role: string;

  @ApiProperty({ example: 'Hello, how can I help?' })
  content: string;

  @ApiPropertyOptional({ example: 'user1' })
  name?: string;
}

export class ChatRequestDto {
  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 'What is the status of my booking?' })
  message: string;

  @ApiPropertyOptional({ type: [ContextMessage] })
  contextMessages?: ContextMessage[];
}
