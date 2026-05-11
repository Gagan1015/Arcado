# Arcado deployment

Arcado is deployed on a single EC2 box with Docker Compose + Caddy, using
the RDS PostgreSQL instance for persistence. See:

- [`ec2/README.md`](ec2/README.md) — architecture overview and cost breakdown
- [`ec2/01-launch.md`](ec2/01-launch.md) — launching a new EC2 (run-once)
- [`ec2/02-deploy-app.md`](ec2/02-deploy-app.md) — deploying the app
- [`ec2/03-dns-cutover.md`](ec2/03-dns-cutover.md) — Namecheap DNS
- [`ec2/04-ci-cd.md`](ec2/04-ci-cd.md) — GitHub Actions auto-deploy
- [`ec2/05-teardown.md`](ec2/05-teardown.md) — removing the old ECS stack

## Ongoing deploys

Every push to `main` automatically deploys via
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

Manual deploy from your laptop:

```bash
ssh -i arcado-ec2.pem ubuntu@<EIP> \
  "cd /srv/arcado && git fetch --all && git reset --hard origin/main && \
   docker compose -f deploy/ec2/docker-compose.prod.yml --env-file /srv/arcado/.env.prod up -d --build"
```

## Runtime files on the EC2

| Path | Purpose |
|---|---|
| `/srv/arcado/` | git checkout (main branch) |
| `/srv/arcado/.env.prod` | secrets, not in git |
| `/srv/arcado/deploy/ec2/.env` → symlink to `.env.prod` | so compose auto-loads env |
| `/srv/arcado/deploy/ec2/Caddyfile` | TLS + reverse proxy |
