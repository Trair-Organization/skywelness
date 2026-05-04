import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { MemberAccountStatus, UserRole } from '../database/enums';

@Injectable()
export class AdminMembersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async listPendingMembers(tenantId: string) {
    return this.usersRepo.find({
      where: {
        tenantId,
        role: UserRole.MEMBER,
        accountStatus: MemberAccountStatus.PENDING_APPROVAL,
      },
      select: ['id', 'email', 'firstName', 'lastName', 'createdAt'],
      order: { createdAt: 'ASC' },
    });
  }

  async approveMember(tenantId: string, userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) {
      throw new NotFoundException('Member not found');
    }
    if (user.accountStatus !== MemberAccountStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Member is not awaiting approval');
    }
    await this.usersRepo.update({ id: userId }, { accountStatus: MemberAccountStatus.ACTIVE });
    return { ok: true as const };
  }

  async rejectMember(tenantId: string, userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId, role: UserRole.MEMBER },
    });
    if (!user) {
      throw new NotFoundException('Member not found');
    }
    if (user.accountStatus !== MemberAccountStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Member is not awaiting approval');
    }
    await this.usersRepo.update({ id: userId }, { accountStatus: MemberAccountStatus.REJECTED });
    return { ok: true as const };
  }
}
