import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Body: { email, password }
   * Returns: { access_token, refresh_token, user: { id, email, username, fullName, role, permissions } }
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const { tokens, user } = await this.authService.login(
      dto.email,
      dto.password,
      req.ip as string | undefined,
      req.headers['user-agent'] as string | undefined,
    );

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user,
    };
  }

  /**
   * POST /auth/register
   * Body: { email, username, password, full_name?, phone? }
   * Returns: { id, email, username, full_name, role }
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.fullName,
      role: 'Staff',
    };
  }

  /**
   * POST /auth/refresh
   * Body: { refresh_token }
   * Returns: { access_token, refresh_token }
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('refresh_token is required');
    }
    const tokens = await this.authService.verifyRefreshToken(refreshToken);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  /**
   * POST /auth/logout
   * Header: Authorization: Bearer <token>
   * Returns: { message: 'Logged out successfully' }
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    // Extract the raw token so we can hash it and delete the session row
    const rawToken: string = (req.headers['authorization'] as string)?.split(' ')[1] ?? '';
    await this.authService.logout(rawToken);
    return { message: 'Logged out successfully' };
  }
}
