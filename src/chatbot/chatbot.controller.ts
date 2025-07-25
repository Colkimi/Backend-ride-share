import { Controller, Post, Body, UseGuards, Delete } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { AtGuard } from 'src/auth/guards';
import { Roles } from '../auth/decorators/index';
import { Role } from 'src/users/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ChatRequestDto } from './dto/chat-request.dto';

@ApiTags('chatbot')
@Controller('chatbot')
@UseGuards(AtGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @ApiOperation({ summary: 'Send a message to the chatbot' })
  @ApiBody({ type: ChatRequestDto })
  @ApiResponse({ status: 201, description: 'The chatbot response' })
  async chat(@Body() chatInputDto: ChatRequestDto) {
    const response = await this.chatbotService.chat(chatInputDto.userId, chatInputDto.message);
    return { response };
  }

  @Delete()
  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @ApiOperation({ summary: 'Reset the chatbot conversation' })
  @ApiResponse({ status: 200, description: 'Conversation reset successfully' })
  resetConversation(@Body('userId') userId: number) {
    this.chatbotService.resetConversation(userId);
    return { message: 'Conversation reset successfully' };
  }
}