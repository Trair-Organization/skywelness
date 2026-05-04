import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738516000000 implements MigrationInterface {
  name = 'InitialSchema1738516000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "tenant" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "subdomain" character varying(100) NOT NULL,
        "branding" jsonb NOT NULL DEFAULT '{}',
        "settings" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenant_subdomain" UNIQUE ("subdomain")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "email" character varying(320) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "first_name" character varying(120) NOT NULL,
        "last_name" character varying(120) NOT NULL,
        "phone" character varying(40),
        "role" character varying(32) NOT NULL,
        "emergency_contact" jsonb,
        "notification_preferences" jsonb,
        "last_login" TIMESTAMP WITH TIME ZONE,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_user_tenant_email" UNIQUE ("tenant_id", "email")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_user_tenant_id" ON "user" ("tenant_id")`);

    await queryRunner.query(`
      CREATE TABLE "trainer" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "bio" text,
        "certifications" jsonb,
        "specializations" jsonb,
        "photo_url" character varying(2048),
        "avg_rating" numeric(3,2) NOT NULL DEFAULT 0,
        "total_sessions" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trainer_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_trainer_user" UNIQUE ("user_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_trainer_tenant_id" ON "trainer" ("tenant_id")`);

    await queryRunner.query(`
      CREATE TABLE "package_type" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "session_count" integer NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "currency" character varying(8) NOT NULL DEFAULT 'TRY',
        "validity_days" integer NOT NULL,
        "session_type" character varying(64) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_package_type" PRIMARY KEY ("id"),
        CONSTRAINT "FK_package_type_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_package_type_tenant_id" ON "package_type" ("tenant_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "package" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "package_type_id" uuid NOT NULL,
        "remaining_sessions" integer NOT NULL,
        "expires_at" date NOT NULL,
        "status" character varying(32) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_package" PRIMARY KEY ("id"),
        CONSTRAINT "FK_package_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_package_package_type" FOREIGN KEY ("package_type_id") REFERENCES "package_type"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_package_user_id" ON "package" ("user_id")`);

    await queryRunner.query(`
      CREATE TABLE "availability" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trainer_id" uuid NOT NULL,
        "date" date NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "available" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_availability" PRIMARY KEY ("id"),
        CONSTRAINT "FK_availability_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "time_slot" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trainer_id" uuid NOT NULL,
        "availability_id" uuid,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "capacity" integer NOT NULL DEFAULT 1,
        "booked_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_time_slot" PRIMARY KEY ("id"),
        CONSTRAINT "FK_time_slot_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_time_slot_availability" FOREIGN KEY ("availability_id") REFERENCES "availability"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_time_slot_trainer_start" ON "time_slot" ("trainer_id", "start_time")`,
    );

    await queryRunner.query(`
      CREATE TABLE "reservation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "package_id" uuid NOT NULL,
        "time_slot_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "session_type" character varying(64) NOT NULL,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" character varying(32) NOT NULL,
        "notes" text,
        "version" integer NOT NULL DEFAULT 1,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reservation" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reservation_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_reservation_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_reservation_package" FOREIGN KEY ("package_id") REFERENCES "package"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_reservation_time_slot" FOREIGN KEY ("time_slot_id") REFERENCES "time_slot"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_reservation_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_reservation_tenant_user_start" ON "reservation" ("tenant_id", "user_id", "start_time")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reservation_tenant_trainer_start" ON "reservation" ("tenant_id", "trainer_id", "start_time")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reservation_active_slot" ON "reservation" ("time_slot_id") WHERE "status" IN ('pending', 'confirmed')`,
    );

    await queryRunner.query(`
      CREATE TABLE "waiting_list" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "time_slot_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "position" integer NOT NULL,
        "notified_at" TIMESTAMP WITH TIME ZONE,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "status" character varying(32) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_waiting_list" PRIMARY KEY ("id"),
        CONSTRAINT "FK_waiting_list_time_slot" FOREIGN KEY ("time_slot_id") REFERENCES "time_slot"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_waiting_list_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "discount_code" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "code" character varying(64) NOT NULL,
        "discount_type" character varying(32) NOT NULL,
        "discount_value" numeric(12,2) NOT NULL,
        "valid_from" date NOT NULL,
        "valid_until" date NOT NULL,
        "usage_limit" integer,
        "usage_count" integer NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_discount_code" PRIMARY KEY ("id"),
        CONSTRAINT "FK_discount_code_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_discount_code_tenant_code" UNIQUE ("tenant_id", "code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_transaction" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "package_id" uuid,
        "discount_code_id" uuid,
        "stripe_payment_intent_id" character varying(255),
        "amount" numeric(12,2) NOT NULL,
        "discount_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "currency" character varying(8) NOT NULL DEFAULT 'TRY',
        "status" character varying(32) NOT NULL,
        "receipt_url" character varying(2048),
        "idempotency_key" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_transaction" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payment_transaction_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_payment_transaction_package" FOREIGN KEY ("package_id") REFERENCES "package"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_payment_transaction_discount" FOREIGN KEY ("discount_code_id") REFERENCES "discount_code"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "UQ_payment_transaction_idempotency" UNIQUE ("idempotency_key"),
        CONSTRAINT "UQ_payment_transaction_stripe_intent" UNIQUE ("stripe_payment_intent_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "health_data" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "date" date NOT NULL,
        "steps" integer NOT NULL DEFAULT 0,
        "calories_burned" integer NOT NULL DEFAULT 0,
        "workout_duration" integer NOT NULL DEFAULT 0,
        "heart_rate" integer,
        "distance" integer,
        "synced_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_health_data" PRIMARY KEY ("id"),
        CONSTRAINT "FK_health_data_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_health_data_user_date" UNIQUE ("user_id", "date")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notification" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" character varying(64) NOT NULL,
        "title" character varying(255) NOT NULL,
        "body" text NOT NULL,
        "data" jsonb,
        "read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rating" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reservation_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "rating" integer NOT NULL,
        "feedback" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rating" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rating_reservation" FOREIGN KEY ("reservation_id") REFERENCES "reservation"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_rating_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_rating_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "CHK_rating_value" CHECK ("rating" >= 1 AND "rating" <= 5)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "facility_access_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "qr_code_hash" character varying(128) NOT NULL,
        "access_granted" boolean NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_facility_access_log" PRIMARY KEY ("id"),
        CONSTRAINT "FK_facility_access_log_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_facility_access_log_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_facility_access_log_tenant_created" ON "facility_access_log" ("tenant_id", "created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "api_key" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "key_hash" character varying(128) NOT NULL,
        "name" character varying(255) NOT NULL,
        "permissions" jsonb,
        "rate_limit" integer NOT NULL DEFAULT 1000,
        "active" boolean NOT NULL DEFAULT true,
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_api_key" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_key_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_api_key_key_hash" UNIQUE ("key_hash")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_package_active_user" ON "package" ("user_id", "expires_at") WHERE "status" = 'active'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "api_key" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "facility_access_log" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rating" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "health_data" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_transaction" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "discount_code" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "waiting_list" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reservation" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "time_slot" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "availability" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "package" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "package_type" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trainer" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant" CASCADE`);
  }
}
