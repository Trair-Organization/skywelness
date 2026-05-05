import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterIndependentTrainerDto } from './dto/register-independent-trainer.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.requestSubdomain ?? null);
  }

  @Post('register-trainer')
  @HttpCode(201)
  registerTrainer(@Body() dto: RegisterIndependentTrainerDto) {
    return this.authService.registerIndependentTrainer(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.requestSubdomain ?? null);
  }

  @Get('username-availability')
  usernameAvailability(
    @Req() req: Request,
    @Query('tenantSubdomain') tenantSubdomain?: string,
    @Query('username') username?: string,
  ) {
    return this.authService.checkUsernameAvailability(
      tenantSubdomain ?? '',
      username ?? '',
      req.requestSubdomain ?? null,
    );
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Delete('me')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  deleteMe(@CurrentUser() user: User) {
    return this.authService.deleteAccount(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: User }) {
    return this.authService.sanitizeUser(req.user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(user, dto);
  }
}
