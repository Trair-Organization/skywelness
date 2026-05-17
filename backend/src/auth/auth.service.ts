import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { In, Repository } from 'typeorm';
import { MemberAccountStatus, UserRole } from '../database/enums';
import { TrainerApplication } from '../database/entities/trainer-application.entity';
import { PartnerApplication } from '../database/entities/partner-application.entity';
import { TrainerProfile } from '../database/entities/trainer-profile.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { RESERVED_SUBDOMAINS } from '../common/tenant/subdomain.constants';
import { MailService } from '../mail/mail.service';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterIndependentTrainerDto } from './dto/register-independent-trainer.dto';
import type { RegisterPartnerDto } from './dto/register-partner.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { JwtAccessPayload, JwtRefreshPayload } from './jwt-payload';

const BCRYPT_ROUNDS = 12;
const PUBLIC_DISCOVERY_TENANT_SUBDOMAIN = 'independent-hub';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(TrainerProfile)
    private readonly trainerProfilesRepo: Repository<TrainerProfile>,
    @InjectRepository(TrainerApplication)
    private readonly trainerApplicationsRepo: Repository<TrainerApplication>,
    @InjectRepository(PartnerApplication)
    private readonly partnerApplicationsRepo: Repository<PartnerApplication>,
    private readonly mail: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private resolveTenantSubdomain(
    inputSubdomain: string | undefined,
    requestSubdomain: string | null | undefined,
  ): string {
    const fromBody = inputSubdomain?.trim().toLowerCase();
    if (fromBody) {
      if (RESERVED_SUBDOMAINS.has(fromBody)) {
        throw new BadRequestException('Reserved subdomain is not a tenant');
      }
      return fromBody;
    }
    const fromHost = requestSubdomain?.trim().toLowerCase();
    if (fromHost) {
      return fromHost;
    }
    throw new BadRequestException('Tenant subdomain is required');
  }

  private async ensurePublicDiscoveryTenant(): Promise<Tenant> {
    const existing = await this.tenantsRepo.findOne({
      where: { subdomain: PUBLIC_DISCOVERY_TENANT_SUBDOMAIN },
    });
    if (existing) {
      return existing;
    }
    const created = this.tenantsRepo.create({
      name: 'Independent Discovery',
      subdomain: PUBLIC_DISCOVERY_TENANT_SUBDOMAIN,
      branding: {},
      settings: { workspaceType: 'public_discovery' },
    });
    return this.tenantsRepo.save(created);
  }

  private normalizeUsername(value: string): string {
    return value.trim().toLocaleLowerCase('tr-TR');
  }

  /** Benzersiz public ID oluştur: UYE-XXXX, EGT-XXXX, KLB-XXXX (alfanumerik, tahmin edilemez) */
  private async generatePublicId(prefix: 'UYE' | 'EGT' | 'KLB'): Promise<string> {
    const chars = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
    const generate = () => {
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return `${prefix}-${code}`;
    };

    // Retry until unique
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = generate();
      if (prefix === 'KLB') {
        const exists = await this.tenantsRepo.findOne({ where: { publicId: candidate }, select: ['id'] });
        if (!exists) return candidate;
      } else {
        const exists = await this.usersRepo.findOne({ where: { publicId: candidate }, select: ['id'] });
        if (!exists) return candidate;
      }
    }
    // Fallback: 6 chars if somehow all 4-char collide
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${prefix}-${code}`;
  }

  private trimUsername(value: string): string {
    return value.replace(/[^a-z0-9çğıöşü_.-]/g, '').slice(0, 40);
  }

  async checkUsernameAvailability(
    tenantSubdomain: string,
    rawUsername: string,
    requestSubdomain?: string | null,
  ) {
    const subdomain = this.resolveTenantSubdomain(tenantSubdomain, requestSubdomain);
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

  async checkEmailAvailability(
    tenantSubdomain: string,
    rawEmail: string,
    requestSubdomain?: string | null,
  ) {
    const subdomain = this.resolveTenantSubdomain(tenantSubdomain, requestSubdomain);
    const email = rawEmail.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return { available: false as const, reason: 'invalid' as const };
    }

    const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
    if (!tenant) {
      throw new NotFoundException(`Tenant not found for subdomain: ${subdomain}`);
    }

    const existing = await this.usersRepo.findOne({
      where: { tenantId: tenant.id, email },
    });

    if (!existing) {
      return { available: true as const, reason: 'available' as const };
    }

    return { available: false as const, reason: 'taken' as const };
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

  async register(dto: RegisterDto, requestSubdomain?: string | null) {
    const hasExplicitTenant = Boolean(dto.tenantSubdomain?.trim() || requestSubdomain?.trim());
    const tenant = hasExplicitTenant
      ? await this.tenantsRepo.findOne({
          where: {
            subdomain: this.resolveTenantSubdomain(dto.tenantSubdomain, requestSubdomain),
          },
        })
      : await this.ensurePublicDiscoveryTenant();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
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
    const publicId = await this.generatePublicId('UYE');
    const user = this.usersRepo.create({
      tenantId: tenant.id,
      email: dto.email.toLowerCase(),
      username,
      publicId,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone?.trim() || null,
      photoUrl: dto.photoUrl?.trim() || null,
      city: dto.city?.trim() || null,
      district: dto.district?.trim() || null,
      role: UserRole.MEMBER,
      accountStatus: hasExplicitTenant
        ? MemberAccountStatus.PENDING_APPROVAL
        : MemberAccountStatus.ACTIVE,
      emergencyContact: null,
      notificationPreferences: null,
      lastLogin: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    await this.usersRepo.save(user);

    return await this.buildAuthResponse(user);
  }

  private slugifyForSubdomain(value: string): string {
    const normalized = value
      .toLocaleLowerCase('tr-TR')
      .replace(/[^a-z0-9çğıöşü\s-]/g, '')
      .replace(/[ç]/g, 'c')
      .replace(/[ğ]/g, 'g')
      .replace(/[ı]/g, 'i')
      .replace(/[ö]/g, 'o')
      .replace(/[ş]/g, 's')
      .replace(/[ü]/g, 'u')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    const base = normalized.slice(0, 20);
    return base || 'coach';
  }

  private async reserveTrainerSubdomain(base: string): Promise<string> {
    const cleanBase = this.slugifyForSubdomain(base);
    let suffix = 0;
    while (suffix < 5000) {
      const candidate = suffix === 0 ? `coach-${cleanBase}` : `coach-${cleanBase}-${suffix}`;
      if (RESERVED_SUBDOMAINS.has(candidate)) {
        suffix += 1;
        continue;
      }
      const exists = await this.tenantsRepo.findOne({ where: { subdomain: candidate } });
      if (!exists) {
        return candidate;
      }
      suffix += 1;
    }
    throw new ConflictException('Could not allocate trainer workspace code');
  }

  async registerIndependentTrainer(dto: RegisterIndependentTrainerDto) {
    let preferredClubSubdomain: string | null = null;
    if (dto.preferredClubSubdomain?.trim()) {
      const normalized = dto.preferredClubSubdomain.trim().toLowerCase();
      const clubTenant = await this.tenantsRepo.findOne({ where: { subdomain: normalized } });
      if (!clubTenant) {
        throw new NotFoundException('Preferred club not found');
      }
      preferredClubSubdomain = normalized;
    }
    const email = dto.email.trim().toLowerCase();
    const anyUserWithEmail = await this.usersRepo.findOne({ where: { email } });
    if (anyUserWithEmail) {
      throw new ConflictException('Email already registered');
    }

    const username = this.normalizeUsername(dto.username);
    const subdomain = await this.reserveTrainerSubdomain(`${dto.firstName}-${dto.lastName}`);

    const tenant = this.tenantsRepo.create({
      name: `${dto.firstName.trim()} ${dto.lastName.trim()} Coaching`,
      subdomain,
      city: dto.city?.trim() || null,
      district: dto.district?.trim() || null,
      branding: {},
      settings: { workspaceType: 'independent_trainer' },
    });
    await this.tenantsRepo.save(tenant);
    // Assign KLB public ID to tenant
    tenant.publicId = await this.generatePublicId('KLB');
    await this.tenantsRepo.save(tenant);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const trainerPublicId = await this.generatePublicId('EGT');
    const user = this.usersRepo.create({
      tenantId: tenant.id,
      email,
      username,
      publicId: trainerPublicId,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone.trim(),
      photoUrl: dto.photoUrl?.trim() || null,
      role: UserRole.INDEPENDENT_TRAINER,
      accountStatus: MemberAccountStatus.PENDING_APPROVAL,
      emergencyContact: null,
      notificationPreferences: null,
      lastLogin: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    await this.usersRepo.save(user);

    const offers = Array.from(new Set(dto.offersSessionTypes));
    const trainer = this.trainersRepo.create({
      userId: user.id,
      tenantId: tenant.id,
      bio: dto.bio.trim(),
      certifications: dto.certifications?.map((x) => x.trim()).filter(Boolean) ?? null,
      specializations: dto.specialties.map((x) => x.trim()).filter(Boolean),
      photoUrl: dto.photoUrl?.trim() || null,
      avgRating: '0.00',
      totalSessions: 0,
      offersSessionTypes: offers,
    });
    await this.trainersRepo.save(trainer);

    const profile = this.trainerProfilesRepo.create({
      userId: user.id,
      trainerId: trainer.id,
      tenantId: tenant.id,
      city: dto.city.trim(),
      bio: dto.bio.trim(),
      specialties: dto.specialties.map((x) => x.trim()).filter(Boolean),
      certifications: dto.certifications?.map((x) => x.trim()).filter(Boolean) ?? null,
      experienceYears: dto.experienceYears ?? null,
      socialLinks: dto.socialLinks?.length ? { links: dto.socialLinks } : null,
      photoUrl: dto.photoUrl?.trim() || null,
      pricingNote: dto.pricingNote?.trim() || null,
    });
    await this.trainerProfilesRepo.save(profile);

    const application = this.trainerApplicationsRepo.create({
      userId: user.id,
      trainerId: trainer.id,
      tenantId: tenant.id,
      status: 'pending',
      adminNote: null,
      preferredClubSubdomain,
      reviewedByUserId: null,
      reviewedAt: null,
    });
    await this.trainerApplicationsRepo.save(application);

    return {
      pendingApproval: true as const,
      applicationId: application.id,
      tenantSubdomain: tenant.subdomain,
      message: 'Trainer application submitted',
    };
  }

  async registerPartnerApplication(dto: RegisterPartnerDto) {
    const application = this.partnerApplicationsRepo.create({
      companyName: dto.companyName.trim(),
      contactName: dto.contactName.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone.trim(),
      city: dto.city.trim(),
      clubCount: dto.clubCount ?? null,
      website: dto.website?.trim() || null,
      logoUrl: dto.logoUrl?.trim() || null,
      notes: dto.notes?.trim() || null,
      status: 'pending',
    });
    const saved = await this.partnerApplicationsRepo.save(application);
    return {
      ok: true as const,
      applicationId: saved.id,
      status: saved.status,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto, requestSubdomain?: string | null) {
    const email = dto.email.trim().toLowerCase();
    const resolvedSubdomain = dto.tenantSubdomain?.trim()
      ? dto.tenantSubdomain.trim().toLowerCase()
      : requestSubdomain?.trim().toLowerCase();
    let user: User | null = null;
    if (resolvedSubdomain) {
      const tenant = await this.tenantsRepo.findOne({ where: { subdomain: resolvedSubdomain } });
      if (tenant) {
        user = await this.usersRepo.findOne({ where: { tenantId: tenant.id, email } });
      }
    } else {
      user = await this.usersRepo.findOne({ where: { email } });
    }

    if (!user) {
      return { ok: true as const };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.usersRepo.update(
      { id: user.id },
      { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: expiresAt },
    );
    const tenant = await this.tenantsRepo.findOne({
      where: { id: user.tenantId },
      select: ['name'],
    });
    void this.mail.sendPasswordReset({
      to: user.email,
      firstName: user.firstName,
      clubName: tenant?.name ?? 'Wellness Club',
      resetToken: rawToken,
    });
    return { ok: true as const };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.usersRepo.findOne({ where: { resetPasswordTokenHash: tokenHash } });
    if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.usersRepo.update(
      { id: user.id },
      {
        passwordHash,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
        refreshTokenVersion: (user.refreshTokenVersion ?? 0) + 1,
      },
    );
    return { ok: true as const };
  }

  async login(dto: LoginDto, requestSubdomain?: string | null) {
    const hasTenantHint = Boolean(dto.tenantSubdomain?.trim() || requestSubdomain?.trim());

    let user: User | null = null;

    if (hasTenantHint) {
      const subdomain = this.resolveTenantSubdomain(dto.tenantSubdomain, requestSubdomain);
      const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
      if (!tenant) {
        throw new UnauthorizedException('Invalid credentials');
      }

      user = await this.usersRepo.findOne({
        where: { tenantId: tenant.id, email: dto.email.toLowerCase() },
        relations: ['tenant'],
      });
    } else {
      const matches = await this.usersRepo.find({
        where: { email: dto.email.toLowerCase() },
        relations: ['tenant'],
      });
      if (matches.length === 0) {
        throw new UnauthorizedException('Invalid credentials');
      }
      if (matches.length > 1) {
        // Şifreyi doğrula (ilk eşleşen ile)
        const firstMatch = matches[0];
        const passwordValid = await bcrypt.compare(dto.password, firstMatch.passwordHash);
        if (!passwordValid) {
          throw new UnauthorizedException('Invalid credentials');
        }
        // Birden fazla kulüp — kulüp seçim ekranı için liste dön (token yok)
        return {
          multiTenant: true as const,
          tenants: matches
            .filter((m) => m.tenant)
            .map((m) => ({
              id: m.tenant.id,
              name: m.tenant.name,
              subdomain: m.tenant.subdomain,
              logoUrl: m.tenant.logoUrl,
              role: m.role,
            })),
        };
      }
      user = matches[0] ?? null;
    }

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

    return await this.buildAuthResponse(user);
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

    return await this.buildAuthResponse(user);
  }

  private assertMemberAccountAllowed(user: User) {
    if (
      user.role !== UserRole.MEMBER &&
      user.role !== UserRole.INDEPENDENT_TRAINER &&
      user.role !== UserRole.TRAINER
    ) {
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

  async deleteAccount(userId: string) {
    await this.usersRepo.increment({ id: userId }, 'refreshTokenVersion', 1);
    await this.usersRepo.delete({ id: userId });
    return { ok: true as const };
  }

  async updateMe(currentUser: User, dto: UpdateMeDto) {
    const user = await this.usersRepo.findOne({
      where: { id: currentUser.id, tenantId: currentUser.tenantId },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName.trim();
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName.trim();
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone === null ? null : dto.phone.trim() || null;
    }
    if (dto.photoUrl !== undefined) {
      user.photoUrl = dto.photoUrl === null ? null : dto.photoUrl.trim() || null;
    }
    if (dto.email !== undefined) {
      const normalized = dto.email.trim().toLowerCase();
      if (normalized !== user.email) {
        const existing = await this.usersRepo.findOne({
          where: { tenantId: user.tenantId, email: normalized },
        });
        if (existing && existing.id !== user.id) {
          throw new ConflictException('Email already registered for this tenant');
        }
        user.email = normalized;
      }
    }
    if (dto.username !== undefined) {
      const normalized = this.normalizeUsername(dto.username);
      if (normalized !== user.username) {
        const existing = await this.usersRepo.findOne({
          where: { tenantId: user.tenantId, username: normalized },
        });
        if (existing && existing.id !== user.id) {
          throw new ConflictException('Username already taken for this tenant');
        }
        user.username = normalized;
      }
    }
    const saved = await this.usersRepo.save(user);
    return this.sanitizeUser(saved);
  }

  async updatePushToken(currentUser: User, expoPushToken: string | null) {
    const user = await this.usersRepo.findOne({
      where: { id: currentUser.id, tenantId: currentUser.tenantId },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const prev = user.notificationPreferences ?? {};
    const next: Record<string, unknown> = { ...prev };
    if (expoPushToken && expoPushToken.trim()) {
      next.expoPushToken = expoPushToken.trim();
    } else {
      delete next.expoPushToken;
    }
    user.notificationPreferences = next;
    await this.usersRepo.save(user);
    return { ok: true as const };
  }

  private async buildAuthResponse(user: User) {
    let tenantSubdomain: string | undefined = user.tenant?.subdomain;
    if (!tenantSubdomain) {
      const tenantRow = await this.tenantsRepo.findOne({
        where: { id: user.tenantId },
        select: ['subdomain'],
      });
      tenantSubdomain = tenantRow?.subdomain;
    }
    if (!tenantSubdomain) {
      throw new InternalServerErrorException('Tenant resolution failed');
    }
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
      tenantSubdomain,
      user: this.sanitizeUser(user),
    };
  }

  sanitizeUser(user: User) {
    return {
      id: user.id,
      publicId: user.publicId,
      tenantId: user.tenantId,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      photoUrl: user.photoUrl,
      role: user.role,
      accountStatus: user.accountStatus,
    };
  }

  /**
   * Kullanıcının aynı email ile üye olduğu TÜM tenant'ları listele.
   * Birden fazla kulübe üye olabilir — keşif ekranında "Bağlı Kulüplerim"
   * olarak gösterilir.
   */
  async listMyMemberships(user: User) {
    if (!user.email) return [];
    const memberships = await this.usersRepo.find({
      where: { email: user.email.toLowerCase() },
      relations: ['tenant'],
    });
    return memberships
      .filter((m) => m.tenant)
      .filter((m) => {
        const sub = m.tenant.subdomain;
        const workspaceType = (m.tenant.settings as { workspaceType?: string } | null)
          ?.workspaceType;
        return (
          sub !== 'independent-hub' &&
          !sub.startsWith('coach-') &&
          workspaceType !== 'public_discovery'
        );
      })
      .map((m) => ({
        membershipId: m.id,
        role: m.role,
        accountStatus: m.accountStatus,
        isCurrent: m.id === user.id,
        tenant: {
          id: m.tenant.id,
          name: m.tenant.name,
          subdomain: m.tenant.subdomain,
          logoUrl: m.tenant.logoUrl ?? null,
          location: m.tenant.location ?? null,
          services: m.tenant.services ?? [],
          featured: m.tenant.featured ?? false,
          visibilityMode: m.tenant.visibilityMode,
          vertical: m.tenant.vertical,
        },
      }));
  }

  /** Kulüp davetini kabul et */
  async acceptMembershipInvite(user: User, membershipUserId: string) {
    const membership = await this.usersRepo.findOne({
      where: { id: membershipUserId, email: user.email.toLowerCase(), accountStatus: MemberAccountStatus.PENDING_APPROVAL },
    });
    if (!membership) throw new NotFoundException('Davet bulunamadı');
    membership.accountStatus = MemberAccountStatus.ACTIVE;
    await this.usersRepo.save(membership);
    return { ok: true, status: 'active' };
  }

  /** Kulüp davetini reddet */
  async rejectMembershipInvite(user: User, membershipUserId: string) {
    const membership = await this.usersRepo.findOne({
      where: { id: membershipUserId, email: user.email.toLowerCase(), accountStatus: MemberAccountStatus.PENDING_APPROVAL },
    });
    if (!membership) throw new NotFoundException('Davet bulunamadı');
    membership.accountStatus = MemberAccountStatus.REJECTED;
    await this.usersRepo.save(membership);
    return { ok: true, status: 'rejected' };
  }
}
