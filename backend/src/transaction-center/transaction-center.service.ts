import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../database/entities/payment-transaction.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { CafeOrder } from '../database/entities/cafe-order.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { User } from '../database/entities/user.entity';
import { ServiceTypeFilter, TransactionFiltersDto } from './dto/transaction-filters.dto';

export interface TransactionRow {
  id: string;
  date: string;
  memberName: string;
  memberId: string;
  serviceType: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
}

export interface TransactionListResponse {
  data: TransactionRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface TransactionSummary {
  totalSpending: number;
  totalSessions: number;
  lastVisitDate: string | null;
}

export interface MostActiveMember {
  memberId: string;
  memberName: string;
  transactionCount: number;
  totalSpending: number;
}

// Raw query result types
interface RawTransactionRow {
  id: string;
  date: string;
  memberName: string;
  memberId: string;
  serviceType: string;
  description: string;
  amount: string;
  currency: string;
  status: string;
}

interface RawAggregateRow {
  total: string;
}

interface RawCountRow {
  count: string;
}

interface RawLastDateRow {
  lastDate: string | null;
}

interface RawMostActiveRow {
  memberId: string;
  memberName: string;
  transactionCount: string;
  totalSpending: string;
}

@Injectable()
export class TransactionCenterService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(CafeOrder)
    private readonly cafeOrderRepo: Repository<CafeOrder>,
    @InjectRepository(ClubEvent)
    private readonly clubEventRepo: Repository<ClubEvent>,
    @InjectRepository(ClubEventRegistration)
    private readonly eventRegRepo: Repository<ClubEventRegistration>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getTransactions(
    tenantId: string,
    filters: TransactionFiltersDto,
  ): Promise<TransactionListResponse> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const offset = (page - 1) * limit;

    const allRows: TransactionRow[] = [];

    // 1. Payment Transactions (massage, PT, padel)
    if (
      !filters.serviceType ||
      filters.serviceType === ServiceTypeFilter.MASSAGE ||
      filters.serviceType === ServiceTypeFilter.PERSONAL_TRAINING ||
      filters.serviceType === ServiceTypeFilter.PADEL
    ) {
      // 1a. Reservations (session-based: massage, PT, padel)
      const resQb = this.reservationRepo
        .createQueryBuilder('r')
        .innerJoin('r.user', 'u')
        .leftJoin('r.package', 'pkg')
        .leftJoin('pkg.packageType', 'ptype')
        .leftJoin('r.spaService', 'spa')
        .select([
          'r.id AS id',
          'r.start_time AS date',
          "CONCAT(u.first_name, ' ', u.last_name) AS \"memberName\"",
          'u.id AS "memberId"',
          'r.session_type AS "serviceType"',
          "COALESCE(spa.name, ptype.name, 'Seans') AS description",
          'COALESCE(CAST(ptype.price AS FLOAT) / NULLIF(ptype.session_count, 0), 0) AS amount',
          "'TRY' AS currency",
          `CASE
            WHEN r.status = 'completed' THEN 'succeeded'
            WHEN r.status = 'confirmed' THEN 'succeeded'
            WHEN r.status = 'cancelled' THEN 'failed'
            ELSE 'pending'
          END AS status`,
        ])
        .where('r.tenant_id = :tenantId', { tenantId });

      if (filters.memberId) {
        resQb.andWhere('u.id = :memberId', { memberId: filters.memberId });
      }
      if (filters.startDate) {
        resQb.andWhere('r.start_time >= :startDate', { startDate: filters.startDate });
      }
      if (filters.endDate) {
        resQb.andWhere('r.start_time <= :endDateEnd', {
          endDateEnd: filters.endDate + 'T23:59:59.999Z',
        });
      }
      if (filters.serviceType === ServiceTypeFilter.MASSAGE) {
        resQb.andWhere("r.session_type = 'massage'");
      } else if (filters.serviceType === ServiceTypeFilter.PERSONAL_TRAINING) {
        resQb.andWhere("r.session_type = 'personal_training'");
      } else if (filters.serviceType === ServiceTypeFilter.PADEL) {
        resQb.andWhere("r.session_type = 'other'");
      }

      const resRows: RawTransactionRow[] = await resQb.getRawMany();
      for (const r of resRows) {
        let serviceType = r.serviceType;
        if (serviceType === 'other') serviceType = 'padel';
        allRows.push({
          id: r.id,
          date: r.date,
          memberName: r.memberName,
          memberId: r.memberId,
          serviceType,
          description: r.description || 'Seans',
          amount: parseFloat(r.amount) || 0,
          currency: r.currency || 'TRY',
          status: r.status,
        });
      }

      // 1b. Payment Transactions (standalone payments without matching reservation)
      const ptQb = this.paymentRepo
        .createQueryBuilder('pt')
        .innerJoin('pt.user', 'u')
        .leftJoin('pt.package', 'pkg')
        .leftJoin('pkg.packageType', 'ptype')
        .select([
          'pt.id AS id',
          'pt.created_at AS date',
          "CONCAT(u.first_name, ' ', u.last_name) AS \"memberName\"",
          'u.id AS "memberId"',
          "COALESCE(ptype.session_type, 'personal_training') AS \"serviceType\"",
          "COALESCE(ptype.name, 'Ödeme') AS description",
          'CAST(pt.amount AS FLOAT) AS amount',
          'pt.currency AS currency',
          'pt.status AS status',
        ])
        .where('u.tenant_id = :tenantId', { tenantId });

      if (filters.memberId) {
        ptQb.andWhere('u.id = :memberId', { memberId: filters.memberId });
      }
      if (filters.startDate) {
        ptQb.andWhere('pt.created_at >= :startDate', { startDate: filters.startDate });
      }
      if (filters.endDate) {
        ptQb.andWhere('pt.created_at <= :endDateEnd', {
          endDateEnd: filters.endDate + 'T23:59:59.999Z',
        });
      }
      if (filters.serviceType === ServiceTypeFilter.MASSAGE) {
        ptQb.andWhere("ptype.session_type = 'massage'");
      } else if (filters.serviceType === ServiceTypeFilter.PERSONAL_TRAINING) {
        ptQb.andWhere("ptype.session_type = 'personal_training'");
      } else if (filters.serviceType === ServiceTypeFilter.PADEL) {
        ptQb.andWhere("ptype.session_type = 'other'");
      }

      const ptRows: RawTransactionRow[] = await ptQb.getRawMany();
      for (const r of ptRows) {
        let serviceType = r.serviceType;
        if (serviceType === 'other') serviceType = 'padel';
        allRows.push({
          id: r.id,
          date: r.date,
          memberName: r.memberName,
          memberId: r.memberId,
          serviceType,
          description: r.description,
          amount: parseFloat(r.amount) || 0,
          currency: r.currency || 'TRY',
          status: r.status,
        });
      }
    }

    // 2. Cafe Orders
    if (!filters.serviceType || filters.serviceType === ServiceTypeFilter.CAFE) {
      const cafeQb = this.cafeOrderRepo
        .createQueryBuilder('co')
        .innerJoin('co.memberUser', 'u')
        .select([
          'co.id AS id',
          'co.created_at AS date',
          'co.customer_name AS "memberName"',
          'u.id AS "memberId"',
          '\'cafe\' AS "serviceType"',
          "'Kafe Siparişi' AS description",
          'co.total_amount AS amount',
          "'TRY' AS currency",
          `CASE
            WHEN co.status = 'completed' THEN 'succeeded'
            WHEN co.status = 'cancelled' THEN 'failed'
            ELSE 'pending'
          END AS status`,
        ])
        .where('co.tenant_id = :tenantId', { tenantId });

      if (filters.memberId) {
        cafeQb.andWhere('u.id = :memberId', { memberId: filters.memberId });
      }
      if (filters.startDate) {
        cafeQb.andWhere('co.created_at >= :startDate', { startDate: filters.startDate });
      }
      if (filters.endDate) {
        cafeQb.andWhere('co.created_at <= :endDateEnd', {
          endDateEnd: filters.endDate + 'T23:59:59.999Z',
        });
      }

      const cafeRows: RawTransactionRow[] = await cafeQb.getRawMany();
      for (const r of cafeRows) {
        allRows.push({
          id: r.id,
          date: r.date,
          memberName: r.memberName,
          memberId: r.memberId,
          serviceType: 'cafe',
          description: r.description,
          amount: parseFloat(r.amount) || 0,
          currency: r.currency || 'TRY',
          status: r.status,
        });
      }
    }

    // 3. Event Registrations
    if (!filters.serviceType || filters.serviceType === ServiceTypeFilter.EVENT) {
      const eventQb = this.eventRegRepo
        .createQueryBuilder('er')
        .innerJoin('er.user', 'u')
        .innerJoin('er.event', 'ev')
        .select([
          'er.id AS id',
          'er.created_at AS date',
          'CONCAT(u.first_name, \' \', u.last_name) AS "memberName"',
          'u.id AS "memberId"',
          '\'event\' AS "serviceType"',
          'ev.title AS description',
          'CAST(ev.price AS FLOAT) AS amount',
          'ev.currency AS currency',
          "'succeeded' AS status",
        ])
        .where('ev.tenant_id = :tenantId', { tenantId });

      if (filters.memberId) {
        eventQb.andWhere('u.id = :memberId', { memberId: filters.memberId });
      }
      if (filters.startDate) {
        eventQb.andWhere('er.created_at >= :startDate', { startDate: filters.startDate });
      }
      if (filters.endDate) {
        eventQb.andWhere('er.created_at <= :endDateEnd', {
          endDateEnd: filters.endDate + 'T23:59:59.999Z',
        });
      }

      const eventRows: RawTransactionRow[] = await eventQb.getRawMany();
      for (const r of eventRows) {
        allRows.push({
          id: r.id,
          date: r.date,
          memberName: r.memberName,
          memberId: r.memberId,
          serviceType: 'event',
          description: r.description || 'Etkinlik',
          amount: parseFloat(r.amount) || 0,
          currency: r.currency || 'TRY',
          status: r.status,
        });
      }
    }

    // Sort by date descending
    allRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = allRows.length;
    const paginatedRows = allRows.slice(offset, offset + limit);

    return {
      data: paginatedRows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getSummary(
    tenantId: string,
    memberId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<TransactionSummary> {
    // Total spending from payment_transactions
    const spendingQb = this.paymentRepo
      .createQueryBuilder('pt')
      .innerJoin('pt.user', 'u')
      .select('COALESCE(SUM(CAST(pt.amount AS FLOAT)), 0)', 'total')
      .where('u.tenant_id = :tenantId', { tenantId })
      .andWhere('u.id = :memberId', { memberId })
      .andWhere("pt.status = 'succeeded'");

    if (startDate) spendingQb.andWhere('pt.created_at >= :startDate', { startDate });
    if (endDate)
      spendingQb.andWhere('pt.created_at <= :endDateEnd', {
        endDateEnd: endDate + 'T23:59:59.999Z',
      });

    const spendingResult: RawAggregateRow | undefined = await spendingQb.getRawOne();
    const totalSpending = parseFloat(spendingResult?.total ?? '0') || 0;

    // Add cafe spending
    const cafeSpendingQb = this.cafeOrderRepo
      .createQueryBuilder('co')
      .select('COALESCE(SUM(co.total_amount), 0)', 'total')
      .where('co.tenant_id = :tenantId', { tenantId })
      .andWhere('co.member_user_id = :memberId', { memberId })
      .andWhere("co.status = 'completed'");

    if (startDate) cafeSpendingQb.andWhere('co.created_at >= :startDate', { startDate });
    if (endDate)
      cafeSpendingQb.andWhere('co.created_at <= :endDateEnd', {
        endDateEnd: endDate + 'T23:59:59.999Z',
      });

    const cafeResult: RawAggregateRow | undefined = await cafeSpendingQb.getRawOne();
    const cafeSpending = parseFloat(cafeResult?.total ?? '0') || 0;

    // Total sessions (massage + PT + padel reservations)
    const sessionsQb = this.reservationRepo
      .createQueryBuilder('r')
      .select('COUNT(*)', 'count')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.user_id = :memberId', { memberId })
      .andWhere("r.status IN ('confirmed', 'completed')");

    if (startDate) sessionsQb.andWhere('r.start_time >= :startDate', { startDate });
    if (endDate)
      sessionsQb.andWhere('r.start_time <= :endDateEnd', {
        endDateEnd: endDate + 'T23:59:59.999Z',
      });

    const sessionsResult: RawCountRow | undefined = await sessionsQb.getRawOne();
    const totalSessions = parseInt(sessionsResult?.count ?? '0') || 0;

    // Last visit date
    const lastVisitQb = this.reservationRepo
      .createQueryBuilder('r')
      .select('MAX(r.start_time)', 'lastDate')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.user_id = :memberId', { memberId })
      .andWhere("r.status IN ('confirmed', 'completed')");

    if (startDate) lastVisitQb.andWhere('r.start_time >= :startDate', { startDate });
    if (endDate)
      lastVisitQb.andWhere('r.start_time <= :endDateEnd', {
        endDateEnd: endDate + 'T23:59:59.999Z',
      });

    const lastVisitResult: RawLastDateRow | undefined = await lastVisitQb.getRawOne();
    const lastVisitDate = lastVisitResult?.lastDate
      ? new Date(lastVisitResult.lastDate).toISOString()
      : null;

    return {
      totalSpending: totalSpending + cafeSpending,
      totalSessions,
      lastVisitDate,
    };
  }

  async getMostActive(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<MostActiveMember[]> {
    // Count transactions per member from payment_transactions
    const ptQb = this.paymentRepo
      .createQueryBuilder('pt')
      .innerJoin('pt.user', 'u')
      .select([
        'u.id AS "memberId"',
        'CONCAT(u.first_name, \' \', u.last_name) AS "memberName"',
        'COUNT(*) AS "transactionCount"',
        'COALESCE(SUM(CAST(pt.amount AS FLOAT)), 0) AS "totalSpending"',
      ])
      .where('u.tenant_id = :tenantId', { tenantId })
      .groupBy('u.id')
      .addGroupBy('u.first_name')
      .addGroupBy('u.last_name');

    if (startDate) ptQb.andWhere('pt.created_at >= :startDate', { startDate });
    if (endDate)
      ptQb.andWhere('pt.created_at <= :endDateEnd', {
        endDateEnd: endDate + 'T23:59:59.999Z',
      });

    const ptResults: RawMostActiveRow[] = await ptQb.getRawMany();

    // Count cafe orders per member
    const cafeQb = this.cafeOrderRepo
      .createQueryBuilder('co')
      .innerJoin('co.memberUser', 'u')
      .select([
        'u.id AS "memberId"',
        'CONCAT(u.first_name, \' \', u.last_name) AS "memberName"',
        'COUNT(*) AS "transactionCount"',
        'COALESCE(SUM(co.total_amount), 0) AS "totalSpending"',
      ])
      .where('co.tenant_id = :tenantId', { tenantId })
      .groupBy('u.id')
      .addGroupBy('u.first_name')
      .addGroupBy('u.last_name');

    if (startDate) cafeQb.andWhere('co.created_at >= :startDate', { startDate });
    if (endDate)
      cafeQb.andWhere('co.created_at <= :endDateEnd', {
        endDateEnd: endDate + 'T23:59:59.999Z',
      });

    const cafeResults: RawMostActiveRow[] = await cafeQb.getRawMany();

    // Count event registrations per member
    const eventQb = this.eventRegRepo
      .createQueryBuilder('er')
      .innerJoin('er.user', 'u')
      .innerJoin('er.event', 'ev')
      .select([
        'u.id AS "memberId"',
        'CONCAT(u.first_name, \' \', u.last_name) AS "memberName"',
        'COUNT(*) AS "transactionCount"',
        'COALESCE(SUM(CAST(ev.price AS FLOAT)), 0) AS "totalSpending"',
      ])
      .where('ev.tenant_id = :tenantId', { tenantId })
      .groupBy('u.id')
      .addGroupBy('u.first_name')
      .addGroupBy('u.last_name');

    if (startDate) eventQb.andWhere('er.created_at >= :startDate', { startDate });
    if (endDate)
      eventQb.andWhere('er.created_at <= :endDateEnd', {
        endDateEnd: endDate + 'T23:59:59.999Z',
      });

    const eventResults: RawMostActiveRow[] = await eventQb.getRawMany();

    // Merge all results by memberId
    const memberMap = new Map<
      string,
      { memberId: string; memberName: string; transactionCount: number; totalSpending: number }
    >();

    for (const r of [...ptResults, ...cafeResults, ...eventResults]) {
      const existing = memberMap.get(r.memberId);
      if (existing) {
        existing.transactionCount += parseInt(r.transactionCount) || 0;
        existing.totalSpending += parseFloat(r.totalSpending) || 0;
      } else {
        memberMap.set(r.memberId, {
          memberId: r.memberId,
          memberName: r.memberName,
          transactionCount: parseInt(r.transactionCount) || 0,
          totalSpending: parseFloat(r.totalSpending) || 0,
        });
      }
    }

    // Sort by transaction count desc, ties by spending desc
    const sorted = Array.from(memberMap.values()).sort((a, b) => {
      if (b.transactionCount !== a.transactionCount) {
        return b.transactionCount - a.transactionCount;
      }
      return b.totalSpending - a.totalSpending;
    });

    return sorted.slice(0, 10);
  }

  async getRecentTransactions(tenantId: string, memberId: string): Promise<TransactionRow[]> {
    const filters: TransactionFiltersDto = { memberId, page: 1, limit: 5 };
    const result = await this.getTransactions(tenantId, filters);
    return result.data;
  }
}
