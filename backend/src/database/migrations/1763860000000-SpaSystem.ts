import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpaSystem1763860000000 implements MigrationInterface {
  name = 'SpaSystem1763860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Spa Services (masaj türleri + cold plunge)
    await queryRunner.query(`
      CREATE TABLE "spa_service" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "description" text,
        "category" character varying(30) NOT NULL,
        "duration_minutes" integer NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "currency" character varying(8) NOT NULL DEFAULT 'TRY',
        "image_url" character varying(2048),
        "benefits" jsonb,
        "active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_spa_service" PRIMARY KEY ("id"),
        CONSTRAINT "FK_spa_service_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_spa_service_tenant_active" ON "spa_service" ("tenant_id", "active")`,
    );

    // Spa Therapists (masözler)
    await queryRunner.query(`
      CREATE TABLE "spa_therapist" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "phone" character varying(40),
        "photo_url" character varying(2048),
        "bio" text,
        "specialties" text[] DEFAULT '{}',
        "working_hours" jsonb,
        "avg_rating" numeric(3,2) DEFAULT 0,
        "total_sessions" integer NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_spa_therapist" PRIMARY KEY ("id"),
        CONSTRAINT "FK_spa_therapist_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_spa_therapist_tenant_active" ON "spa_therapist" ("tenant_id", "active")`,
    );

    // Spa Packages (5/10/20 seans paketleri)
    await queryRunner.query(`
      CREATE TABLE "spa_package" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "description" text,
        "session_count" integer NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "currency" character varying(8) NOT NULL DEFAULT 'TRY',
        "validity_days" integer NOT NULL,
        "applicable_categories" text[] DEFAULT '{}',
        "active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_spa_package" PRIMARY KEY ("id"),
        CONSTRAINT "FK_spa_package_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_spa_package_tenant_active" ON "spa_package" ("tenant_id", "active")`,
    );

    // Spa Bookings (rezervasyonlar)
    await queryRunner.query(`
      CREATE TABLE "spa_booking" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "therapist_id" uuid,
        "package_id" uuid,
        "booking_date" date NOT NULL,
        "time_slot" character varying(10) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "notes" text,
        "admin_note" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_spa_booking" PRIMARY KEY ("id"),
        CONSTRAINT "FK_spa_booking_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spa_booking_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spa_booking_service" FOREIGN KEY ("service_id") REFERENCES "spa_service"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spa_booking_therapist" FOREIGN KEY ("therapist_id") REFERENCES "spa_therapist"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_spa_booking_tenant_status" ON "spa_booking" ("tenant_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_spa_booking_user_date" ON "spa_booking" ("user_id", "booking_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_spa_booking_therapist_date" ON "spa_booking" ("therapist_id", "booking_date")`,
    );

    // Spa Reviews (yorumlar)
    await queryRunner.query(`
      CREATE TABLE "spa_review" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "therapist_id" uuid,
        "rating" integer NOT NULL,
        "comment" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_spa_review" PRIMARY KEY ("id"),
        CONSTRAINT "FK_spa_review_booking" FOREIGN KEY ("booking_id") REFERENCES "spa_booking"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spa_review_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spa_review_therapist" FOREIGN KEY ("therapist_id") REFERENCES "spa_therapist"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "spa_review" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "spa_booking" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "spa_package" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "spa_therapist" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "spa_service" CASCADE`);
  }
}
