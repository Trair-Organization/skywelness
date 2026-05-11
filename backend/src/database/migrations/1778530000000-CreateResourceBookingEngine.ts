import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResourceBookingEngine1778530000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tenant vertical field
    await queryRunner.query(`ALTER TABLE tenant ADD COLUMN IF NOT EXISTS vertical VARCHAR(30) DEFAULT 'wellness'`);

    // Resource table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS resource (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        capacity INT NOT NULL DEFAULT 1,
        duration_minutes INT NOT NULL DEFAULT 60,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
        description TEXT,
        image_url VARCHAR(2048),
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Resource Slot table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS resource_slot (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
        resource_id UUID NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time VARCHAR(5) NOT NULL,
        end_time VARCHAR(5) NOT NULL,
        price DECIMAL(10,2),
        status VARCHAR(20) NOT NULL DEFAULT 'available',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_resource_slot_lookup ON resource_slot(resource_id, date, start_time)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_resource_slot_tenant ON resource_slot(tenant_id, date, status)`);

    // Addon table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS addon (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
        image_url VARCHAR(2048),
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Booking table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        resource_id UUID NOT NULL REFERENCES resource(id) ON DELETE RESTRICT,
        resource_slot_id UUID NOT NULL REFERENCES resource_slot(id) ON DELETE RESTRICT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        participant_count INT NOT NULL DEFAULT 1,
        participants JSONB,
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
        payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        stripe_session_id VARCHAR(500),
        stripe_payment_intent_id VARCHAR(500),
        notes TEXT,
        cancelled_at TIMESTAMPTZ,
        cancelled_by VARCHAR(20),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_booking_tenant_user ON booking(tenant_id, user_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_booking_slot ON booking(tenant_id, resource_slot_id)`);

    // Booking Addon table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_addon (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id UUID NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
        addon_id UUID NOT NULL REFERENCES addon(id) ON DELETE RESTRICT,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL
      )
    `);

    // Seed O'Padel tenant
    await queryRunner.query(`
      INSERT INTO tenant (id, name, subdomain, vertical, description, location, services, featured, branding, settings, invite_code)
      VALUES (
        uuid_generate_v4(),
        'O''Padel',
        'opadel',
        'padel',
        'İstanbul''un en modern padel tesisi. 5 kort, profesyonel ekipman.',
        'İstanbul',
        ARRAY['Padel', 'Kort Kiralama', 'Ekipman'],
        true,
        '{}',
        '{"workspaceType": "partner_club"}',
        'OPADEL01'
      )
      ON CONFLICT (subdomain) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS booking_addon`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking`);
    await queryRunner.query(`DROP TABLE IF EXISTS addon`);
    await queryRunner.query(`DROP TABLE IF EXISTS resource_slot`);
    await queryRunner.query(`DROP TABLE IF EXISTS resource`);
    await queryRunner.query(`ALTER TABLE tenant DROP COLUMN IF EXISTS vertical`);
  }
}
