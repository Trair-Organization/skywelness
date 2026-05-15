const { Client } = require('pg');
const c = new Client('postgresql://rezidans:rezidans_dev_pass@127.0.0.1:5432/rezidans_dev');
const SKYLAND = '00000000-0000-4000-8000-000000000002';

async function run() {
  await c.connect();

  // 3 masaj odası oluştur
  const rooms = [
    {
      name: 'Masaj Odası 1 (Çift)',
      type: 'massage_room',
      capacity: 2,
      price: 3000,
      desc: 'Çiftler için geniş masaj odası',
    },
    {
      name: 'Masaj Odası 2 (Çift)',
      type: 'massage_room',
      capacity: 2,
      price: 3000,
      desc: 'Çiftler için masaj odası',
    },
    {
      name: 'Masaj Odası 3 (Tek)',
      type: 'massage_room',
      capacity: 1,
      price: 2000,
      desc: 'Tek kişilik masaj odası',
    },
  ];

  const roomIds = [];
  for (const r of rooms) {
    const res = await c.query(
      `INSERT INTO resource (tenant_id, name, resource_type, capacity, duration_minutes, price, currency, description, active, sort_order)
       VALUES ($1, $2, $3, $4, 60, $5, 'TRY', $6, true, $7)
       ON CONFLICT DO NOTHING
       RETURNING id, name`,
      [SKYLAND, r.name, r.type, r.capacity, r.price, r.desc, roomIds.length],
    );
    if (res.rows.length > 0) {
      roomIds.push(res.rows[0].id);
      console.log('Created room:', res.rows[0].name, res.rows[0].id);
    }
  }

  // Mevcut masaj hizmetlerini güncelle — resource_id ata
  // Masöz ID'lerini bul
  const masozler = await c.query(
    `SELECT t.id as trainer_id, u.first_name, u.last_name
     FROM trainer t JOIN "user" u ON t.user_id = u.id
     WHERE t.tenant_id = $1 AND t.offers_session_types @> ARRAY['massage']`,
    [SKYLAND],
  );
  console.log(
    'Masözler:',
    masozler.rows.map((m) => `${m.first_name} ${m.last_name} (${m.trainer_id})`),
  );

  // Mevcut masaj service_catalog kayıtlarına resource_id ata
  // Tek kişilik masözler → Oda 3, Çift kişilik → Oda 1 veya 2
  if (roomIds.length >= 3) {
    // Tüm masaj hizmetlerini bul
    const services = await c.query(
      `SELECT id, name, provider_id, capacity FROM service_catalog
       WHERE tenant_id = $1 AND category = 'massage' AND active = true`,
      [SKYLAND],
    );

    for (const svc of services.rows) {
      // Kapasite 1 → Oda 3 (tek), Kapasite 2 → Oda 1
      const roomId = svc.capacity >= 2 ? roomIds[0] : roomIds[2];
      await c.query(`UPDATE service_catalog SET resource_id = $1 WHERE id = $2`, [roomId, svc.id]);
      console.log(`Service "${svc.name}" → Room ${roomId}`);
    }
  }

  await c.end();
  console.log('Done!');
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
