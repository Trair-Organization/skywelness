import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { MemberAccountStatus, UserRole } from '../database/enums';
import { Tenant } from '../database/entities/tenant.entity';
import { User } from '../database/entities/user.entity';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtAccessPayload, JwtRefreshPayload } from './jwt-payload';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private tenantSubdomain(dto: { tenantSubdomain: string }): string {
    return dto.tenantSubdomain.trim().toLowerCase();
  }

  private normalizeUsername(value: string): string {
    return value.trim().toLocaleLowerCase('tr-TR');
  }

  private trimUsername(value: string): string {
    return value.replace(/[^a-z0-9çğıöşü_.-]/g, '').slice(0, 40);
  }

  async checkUsernameAvailability(tenantSubdomain: string, rawUsername: string) {
    const subdomain = tenantSubdomain.trim().toLowerCase();
    const username = this.normalizeUsername(rawUsername);

    if (username.length < 3) {
      return {
        available: false as const,
        reason: 'too_short' as const,
        suggestions: [] as string[],
      };
    }

    const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
    if (!tenant) {
      throw new NotFoundException(`Tenant not found for subdomain: ${subdomain}`);
    }

    const existing = await this.usersRepo.findOne({
      where: { tenantId: tenant.id, username },
    });

    if (!existing) {
      return {
        available: true as const,
        reason: 'available' as const,
        suggestions: [] as string[],
      };
    }

    const suggestions = await this.buildUsernameSuggestions(tenant.id, username);
    return {
      available: false as const,
      reason: 'taken' as const,
      suggestions,
    };
  }

  private async buildUsernameSuggestions(tenantId: string, username: string): Promise<string[]> {
    const base = this.trimUsername(username) || 'member';
    const compact = base.replace(/[._-]+/g, '') || 'member';
    const year = new Date().getFullYear();

    const rawCandidates = [
      `${base}01`,
      `${base}fit`,
      `${base}${year}`,
      `${compact}01`,
      `${compact}fit`,
      `${compact}${year}`,
      `${base}_wc`,
      `${base}_club`,
      `${compact}99`,
    ];

    const candidates = Array.from(
      new Set(rawCandidates.map((v) => this.trimUsername(v)).filter((v) => v.length >= 3)),
    ).slice(0, 12);

    if (candidates.length === 0) {
      return [];
    }

    const existingRows = await this.usersRepo.find({
      where: { tenantId, username: In(candidates) },
      select: ['username'],
    });
    const taken = new Set(existingRows.map((row) => row.username));
    return candidates.filter((item) => !taken.has(item)).slice(0, 3);
  }

  async register(dto: RegisterDto) {
    const subdomain = this.tenantSubdomain(dto);
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
    if (!tenant) {
      throw new NotFoundException(`Tenant not found for subdomain: ${subdomain}`);
    }

    const existing = await this.usersRepo.findOne({
      where: { tenantId: tenant.id, email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered for this tenant');
    }
    const username = this.normalizeUsername(dto.username);
    const existingUsername = await this.usersRepo.findOne({
      where: { tenantId: tenant.id, username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken for this tenant');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.usersRepo.create({
      tenantId: tenant.id,
      email: dto.email.toLowerCase(),
      username,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone?.trim() || null,
      role: UserRole.MEMBER,
      accountStatus: MemberAccountStatus.PENDING_APPROVAL,
      emergencyContact: null,
      notificationPreferences: null,
      lastLogin: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    await this.usersRepo.save(user);

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const subdomain = this.tenantSubdomain(dto);
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.usersRepo.findOne({
      where: { tenantId: tenant.id, email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked');
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      await this.usersRepo.increment({ id: user.id }, 'failedLoginAttempts', 1);
      const fresh = await this.usersRepo.findOne({ where: { id: user.id } });
      if (fresh && fresh.failedLoginAttempts >= 5) {
        await this.usersRepo.update(
          { id: user.id },
          { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
        );
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertMemberAccountAllowed(user);

    await this.usersRepo.update(
      { id: user.id },
      { failedLoginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    );

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersRepo.findOne({
      where: { id: payload.sub, tenantId: payload.tid },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.v !== user.refreshTokenVersion) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    this.assertMemberAccountAllowed(user);

    return this.buildAuthResponse(user);
  }

  private assertMemberAccountAllowed(user: User) {
    if (user.role !== UserRole.MEMBER) {
      return;
    }
    if (user.accountStatus === MemberAccountStatus.REJECTED) {
      throw new UnauthorizedException(
        'Your membership was not accepted. Please contact your club if you believe this is a mistake.',
      );
    }
  }

  async logout(userId: string) {
    await this.usersRepo.increment({ id: userId }, 'refreshTokenVersion', 1);
    return { ok: true as const };
  }

  private buildAuthResponse(user: User) {
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      tid: user.tenantId,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(accessPayload);
    const seconds = Number.parseInt(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_SECONDS', '900'),
      10,
    );
    const expiresIn = Number.isFinite(seconds) && seconds > 0 ? seconds : 900;

    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      tid: user.tenantId,
      role: user.role,
      v: user.refreshTokenVersion ?? 0,
    };
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshSeconds = Number.parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_SECONDS', '604800'),
      10,
    );
    const refreshExpiresIn =
      Number.isFinite(refreshSeconds) && refreshSeconds > 0 ? refreshSeconds : 604800;
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: this.sanitizeUser(user),
    };
  }

  sanitizeUser(user: User) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      accountStatus: user.accountStatus,
    };
  }
}
