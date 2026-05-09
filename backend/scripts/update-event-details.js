const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://rezidans:rezidans_dev_pass@localhost:5432/rezidans_dev',
});

async function run() {
  await client.connect();

  // Kategoriler
  await client.query(`UPDATE club_event SET category = 'yoga' WHERE title IN ('Sunrise Yoga', 'YogaFit')`);
  await client.query(`UPDATE club_event SET category = 'hiit' WHERE title IN ('Hyrox Training', 'Full Body HIIT')`);
  await client.query(`UPDATE club_event SET category = 'strength' WHERE title = 'Move Strong'`);
  await client.query(`UPDATE club_event SET category = 'social' WHERE title IN ('Volleyball Match', 'Football Match')`);
  await client.query(`UPDATE club_event SET category = 'outdoor' WHERE title LIKE '%Bebek%'`);
  await client.query(`UPDATE club_event SET category = 'workshop' WHERE title LIKE '%Skywell Reset%'`);
  await client.query(`UPDATE club_event SET category = 'yoga' WHERE title LIKE '%Mobility%'`);

  // Gereksinimler
  await client.query(`UPDATE club_event SET requirements = 'Yoga matı (kulüpte mevcut), rahat kıyafet, su şişesi' WHERE category = 'yoga'`);
  await client.query(`UPDATE club_event SET requirements = 'Spor ayakkabı, havlu, su şişesi' WHERE category IN ('hiit', 'strength')`);
  await client.query(`UPDATE club_event SET requirements = 'Spor kıyafet, su şişesi' WHERE category = 'social'`);
  await client.query(`UPDATE club_event SET requirements = 'Yürüyüş ayakkabısı, su şişesi, güneş kremi' WHERE category = 'outdoor'`);

  // Skywell Reset Weekend schedule
  const schedule = JSON.stringify([
    { time: '10:00', title: 'Açılış & Tanıtım' },
    { time: '11:00-12:00', title: 'Yoga Seansı' },
    { time: '12:30-13:30', title: 'Sağlıklı Öğle Yemeği' },
    { time: '14:00-15:00', title: 'Meditasyon & Nefes' },
    { time: '15:30-16:30', title: 'Spa & Masaj' },
    { time: '17:00', title: 'Kapanış' },
  ]);
  await client.query(`UPDATE club_event SET schedule = $1 WHERE title LIKE '%Skywell Reset%'`, [schedule]);

  // Bebek Coastal Walk schedule
  const walkSchedule = JSON.stringify([
    { time: '08:00', title: 'Skyland Lobi Buluşma' },
    { time: '08:15', title: 'Bebek Sahile Hareket' },
    { time: '08:30-09:30', title: 'Sahil Yürüyüşü' },
    { time: '09:30-10:00', title: 'Cafe Molası' },
  ]);
  await client.query(`UPDATE club_event SET schedule = $1 WHERE title LIKE '%Bebek%'`, [walkSchedule]);

  console.log('Etkinlikler güncellendi');
  await client.end();
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
