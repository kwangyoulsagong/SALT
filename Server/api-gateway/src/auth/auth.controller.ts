import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GetUser } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { UserPayload } from './decorators/get-user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
@ApiTags('Authentication') // API 그룹 태그
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: '사용자 회원가입',
    description: '새로운 사용자 계정을 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '사용자 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 입력' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
  @ApiBearerAuth() // Swagger에 Bearer 인증 표시
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: UserPayload) {
    return user;
  }
}
