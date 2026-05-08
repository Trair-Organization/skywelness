import { Controller, Get, HttpCode } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Load balancer / systemd / monitoring probe'ları için hafif health check.
 * Throttle'dan muaf; sık çağrılabilir.
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /** "Canlı mı?" — süreç ayakta ise 200 döner. DB'yi test etmez. */
  @Get('live')
  @HttpCode(200)
  live() {
    return { status: 'ok', uptime: process.uptime() };
  }

  /** "Trafik almaya hazır mı?" — DB'yi de doğrular. */
  @Get('ready')
  async ready() {
    const checks: Record<string, { ok: boolean; error?: string }> = {};

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = { ok: true };
    } catch (err) {
      checks.database = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const ok = Object.values(checks).every((c) => c.ok);
    return {
      status: ok ? 'ok' : 'degraded',
      checks,
    };
  }

  /** `/health` root alias'ı — `/health/live` ile eşdeğer. */
  @Get()
  @HttpCode(200)
  root() {
    return { status: 'ok' };
  }
}
