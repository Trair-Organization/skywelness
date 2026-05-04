import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import type { JwtAccessPayload } from './jwt-payload';
import { User } from '../database/entities/user.entity';
import { MemberAccountStatus, UserRole } from '../database/enums';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id: payload.sub, tenantId: payload.tid },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.role === UserRole.MEMBER) {
      if (user.accountStatus === MemberAccountStatus.PENDING_APPROVAL) {
        throw new UnauthorizedException('Membership is not approved yet');
      }
      if (user.accountStatus === MemberAccountStatus.REJECTED) {
        throw new UnauthorizedException('Membership was not accepted');
      }
    }
    return user;
  }
}
