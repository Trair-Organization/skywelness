import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomeBanner } from '../database/entities/home-banner.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@SkipThrottle()
@Controller('home-banners')
export class HomeBannersController {
  constructor(
    @InjectRepository(HomeBanner) private readonly repo: Repository<HomeBanner>,
  ) {}

  /** Public: Aktif banner'ları sıralı getir. */
  @Get()
  async list() {
    return this.repo.find({
      where: { active: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /** Admin: Tüm banner'ları getir (aktif + pasif). */
  @Get('all')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  async listAll() {
    return this.repo.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  /** Admin: Yeni banner ekle. */
  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  async create(
    @Body()
    body: {
      title: string;
      subtitle?: string;
      imageUrl: string;
      linkUrl?: string;
      buttonText?: string;
      sortOrder?: number;
    },
  ) {
    const banner = this.repo.create({
      title: body.title,
      subtitle: body.subtitle ?? null,
      imageUrl: body.imageUrl,
      linkUrl: body.linkUrl ?? null,
      buttonText: body.buttonText ?? null,
      sortOrder: body.sortOrder ?? 0,
      active: true,
    });
    return this.repo.save(banner);
  }

  /** Admin: Banner güncelle. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  async update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      subtitle: string | null;
      imageUrl: string;
      linkUrl: string | null;
      buttonText: string | null;
      sortOrder: number;
      active: boolean;
    }>,
  ) {
    await this.repo.update(id, body);
    return this.repo.findOneBy({ id });
  }

  /** Admin: Banner sil. */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  async remove(@Param('id') id: string) {
    await this.repo.delete(id);
    return { deleted: true };
  }
}
