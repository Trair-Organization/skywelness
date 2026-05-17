import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Patch,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { imageUploadOptions } from '../common/uploads/upload.config';
import { User } from '../database/entities/user.entity';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterIndependentTrainerDto } from './dto/register-independent-trainer.dto';
import { RegisterPartnerDto } from './dto/register-partner.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(201)
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.requestSubdomain ?? null);
  }

  @Post('register-trainer')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(201)
  registerTrainer(@Body() dto: RegisterIndependentTrainerDto) {
    return this.authService.registerIndependentTrainer(dto);
  }

  @Post('register-partner')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(201)
  registerPartner(@Body() dto: RegisterPartnerDto) {
    return this.authService.registerPartnerApplication(dto);
  }

  @Post('upload-image')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      return { message: 'No file uploaded' };
    }
    return { url: `/uploads/${file.filename}` };
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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

  @Get('email-availability')
  emailAvailability(
    @Req() req: Request,
    @Query('tenantSubdomain') tenantSubdomain?: string,
    @Query('email') email?: string,
  ) {
    return this.authService.checkEmailAvailability(
      tenantSubdomain ?? '',
      email ?? '',
      req.requestSubdomain ?? null,
    );
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(dto, req.requestSubdomain ?? null);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
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

  @Get('my-memberships')
  @UseGuards(JwtAuthGuard)
  myMemberships(@CurrentUser() user: User) {
    return this.authService.listMyMemberships(user);
  }

  /** Kulüp davetini kabul et (pending → active) */
  @Post('memberships/:membershipUserId/accept')
  @UseGuards(JwtAuthGuard)
  acceptMembership(
    @CurrentUser() user: User,
    @Param('membershipUserId') membershipUserId: string,
  ) {
    return this.authService.acceptMembershipInvite(user, membershipUserId);
  }

  /** Kulüp davetini reddet (pending → rejected) */
  @Post('memberships/:membershipUserId/reject')
  @UseGuards(JwtAuthGuard)
  rejectMembership(
    @CurrentUser() user: User,
    @Param('membershipUserId') membershipUserId: string,
  ) {
    return this.authService.rejectMembershipInvite(user, membershipUserId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(user, dto);
  }

  @Patch('push-token')
  @UseGuards(JwtAuthGuard)
  updatePushToken(@CurrentUser() user: User, @Body() dto: UpdatePushTokenDto) {
    return this.authService.updatePushToken(user, dto.expoPushToken ?? null);
  }
}
