const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const DB = process.env.DATABASE_URL;
const EMAIL = 'basturktanju@gmail.com';
const PASS = 'Tanju86.';

if (!DB) {
  throw new Error('DATABASE_URL is required');
}

const targets = [
  {
    subdomain: 'skyland-wellness',
    role: 'member',
    first: 'Tanju',
    last: 'Basturk',
    username: 'tanju_member',
  },
  {
    subdomain: 'demo',
    role: 'administrator',
    first: 'Tanju',
    last: 'Admin',
    username: 'tanju_admin',
  },
  {
    subdomain: 'coach-test-coach',
    role: 'trainer',
    first: 'Tanju',
    last: 'Trainer',
    username: 'tanju_trainer',
  },
  {
    subdomain: 'coach-test-coach-5',
    role: 'platform_admin',
    first: 'Tanju',
    last: 'SuperAdmin',
    username: 'tanju_platform',
  },
];

async function run() {
  const c = new Client({ connectionString: DB });
  await c.connect();
  const passwordHash = await bcrypt.hash(PASS, 10);

  for (const t of targets) {
    const tenantRes = await c.query(
      'select id,name,subdomain from tenant where subdomain=$1 limit 1',
      [t.subdomain],
    );
    if (!tenantRes.rowCount) {
      console.log(`missing tenant ${t.subdomain}`);
      continue;
    }
    const tenant = tenantRes.rows[0];

    const userRes = await c.query(
      'select id from "user" where tenant_id=$1 and lower(email)=lower($2) limit 1',
      [tenant.id, EMAIL],
    );
    let userId;
    if (!userRes.rowCount) {
      userId = randomUUID();
      await c.query(
        `insert into "user" (id,tenant_id,email,username,password_hash,first_name,last_name,role,account_status,created_at,updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,'active',now(),now())`,
        [userId, tenant.id, EMAIL, t.username, passwordHash, t.first, t.last, t.role],
      );
      console.log(`created user ${t.role} ${t.subdomain}`);
    } else {
      userId = userRes.rows[0].id;
      await c.query(
        `update "user"
         set username=$2,password_hash=$3,first_name=$4,last_name=$5,role=$6,account_status='active',failed_login_attempts=0,locked_until=null,updated_at=now()
         where id=$1`,
        [userId, t.username, passwordHash, t.first, t.last, t.role],
      );
      console.log(`updated user ${t.role} ${t.subdomain}`);
    }

    if (t.role === 'trainer') {
      const tr = await c.query('select id from trainer where user_id=$1 and tenant_id=$2 limit 1', [
        userId,
        tenant.id,
      ]);
      if (!tr.rowCount) {
        await c.query(
          `insert into trainer (id,user_id,tenant_id,bio,certifications,specializations,photo_url,avg_rating,total_sessions,offers_session_types,created_at,updated_at)
           values ($1,$2,$3,null,null,null,null,0,0,$4::text[],now(),now())`,
          [randomUUID(), userId, tenant.id, ['personal_training', 'massage']],
        );
        console.log(`created trainer row ${t.subdomain}`);
      }
    }
  }

  const check = await c.query(
    `select u.email,u.role,t.subdomain
     from "user" u
     join tenant t on t.id=u.tenant_id
     where lower(u.email)=lower($1)
     order by t.subdomain`,
    [EMAIL],
  );
  console.log(JSON.stringify(check.rows, null, 2));

  await c.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
