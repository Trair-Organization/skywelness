---
inclusion: always
---

# Deploy: GitHub + sunucu

Özellik veya düzeltme bittiyinde (kullanıcı özellikle istemese bile):

1. **Yerel:** `git status` → gerekirse `git add -A` + `git commit` → **`git push origin main`**.
2. **Sunucu** (`ssh -i ~/.ssh/id_hetzner root@46.225.178.143`):
   - `cd /opt/skywelness/app`
   - `cp -a backend/.env /tmp/wellness-backend.env.bak`
   - `git fetch origin && git reset --hard origin/main`
   - `cp -a /tmp/wellness-backend.env.bak backend/.env`
   - `npm ci` → **`npm run migration:run -w backend`** (yeni migration varsa zorunlu)
   - `npm run build -w backend` → **`systemctl restart wellness-api.service`**
3. API port: **3100** (köke `GET /api/v1/` ile duman testi).

Monorepo kökünden komutlar; `git config --global safe.directory /opt/skywelness/app` gerekirse bir kez.
