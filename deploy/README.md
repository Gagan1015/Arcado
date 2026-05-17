# Arcado deployment

Arcado runs on a single EC2 box with Docker Compose + Caddy, backed by an
RDS PostgreSQL instance. The full runbook (architecture, one-time setup,
DB migrations, rollback, troubleshooting) lives in:

- [`ec2/README.md`](ec2/README.md)

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
| `/srv/arcado/deploy/ec2/Caddyfile` | TLS + reverse proxy |
| `/srv/arcado/deploy/ec2/docker-compose.prod.yml` | client + server + caddy |
