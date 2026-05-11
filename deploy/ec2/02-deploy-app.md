# Step 2 – Deploy the app on the new box

Before you SSH in, push this branch (with the new `deploy/ec2/` files) to
your GitHub `main` branch so the box can clone it.

```powershell
git add deploy/ec2 .github/workflows/deploy.yml .gitignore
git commit -m "deploy: single-box EC2 + Caddy setup"
git push origin main
```

## 1. Copy .env.prod to the box

From your laptop:

```powershell
scp -i arcado-ec2.pem .env.prod ubuntu@$eip:/srv/arcado/.env.prod
```

Confirm `ADMIN_EMAILS` and `GITHUB_CLIENT_ID` are filled in before copying
(open `.env.prod` in VS Code — both must have real values or the app will
misbehave).

## 2. Clone + first deploy

```powershell
ssh -i arcado-ec2.pem ubuntu@$eip
```

On the box:

```bash
cd /srv/arcado
git init
git remote add origin https://github.com/<your-gh-user>/arcado.git
git fetch --depth=1 origin main
git checkout -f main

# Move .env.prod out of the way of git reset (CI does `git reset --hard`).
# Our workflow reads it from /srv/arcado/.env.prod which sits next to the repo.
ls -la /srv/arcado/.env.prod   # should already exist from step 1

docker compose -f deploy/ec2/docker-compose.prod.yml \
               --env-file /srv/arcado/.env.prod \
               up -d --build
```

First build pulls base images and compiles Next.js — **expect 5–8 minutes on
t3.small**. You can watch the build live:

```bash
docker compose -f deploy/ec2/docker-compose.prod.yml logs -f
```

## 3. Sanity check on the box

```bash
docker compose -f deploy/ec2/docker-compose.prod.yml ps
# all three containers should be Up (healthy) after ~60 s

curl -I http://localhost            # Caddy should 308 to https
curl -k -I https://localhost        # Caddy self-healthcheck
curl http://localhost:3000 -I       # client container (via internal network)
```

Caddy **can't** obtain a real TLS cert until DNS points at the EIP. You'll
see repeated ACME errors in `caddy` logs for now — that's expected and
safe to ignore until Step 3.

---

Now move to Step 3 (DNS flip).
