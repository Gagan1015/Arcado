# Arcado on a single EC2 box

This is the live production deployment: **one EC2 instance**, Caddy for TLS,
Docker Compose for the client + server, and an RDS PostgreSQL instance.
Roughly **\$20–30 + RDS** per month.

```
                 Route53
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   arcado.gagankumar.me   api.arcado.gagankumar.me
          │                   │
          └──────── EIP ──────┘
                    │
              EC2 t3.small (Ubuntu 24.04)
              ┌───────────────────────────┐
              │ Caddy :80/:443            │  auto Let's Encrypt
              │ ├── arcado.* → client:3000│
              │ └── api.*    → server:3001│
              │ Docker Compose            │
              └──────────┬────────────────┘
                         │ :5432 (private)
                         ▼
                    RDS PostgreSQL
```

---

## One-time setup

Everything runs against AWS CLI in `ap-south-1`. Replace the placeholder values
where marked.

### 0. Variables to keep consistent

```powershell
$region    = "ap-south-1"
$az        = "ap-south-1a"
$keyName   = "arcado-ec2"
$sgName    = "arcado-ec2-sg"
$rdsSgId   = "sg-xxxxxxxx"         # current RDS security group
$vpcId     = "vpc-xxxxxxxx"        # VPC where RDS lives (use default VPC if RDS is there)
$subnetId  = "subnet-xxxxxxxx"     # a PUBLIC subnet in that VPC
$amiId     = "ami-0f918f7e67a3323f0" # Ubuntu 24.04 LTS x86_64, ap-south-1 (see note below)
```

> **AMI lookup**: Ubuntu updates AMIs regularly. Get the current ID with
> `aws ec2 describe-images --owners 099720109477 --filters "Name=name,Values=ubuntu/images/hwp-ssd/ubuntu-noble-24.04-amd64-server-*" "Name=state,Values=available" --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text --region ap-south-1`.

### 1. Create an SSH key pair

```powershell
aws ec2 create-key-pair --key-name $keyName --region $region `
  --query "KeyMaterial" --output text > arcado-ec2.pem
# on Windows PowerShell, lock it down:
icacls arcado-ec2.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

Keep `arcado-ec2.pem` somewhere safe — you'll paste the same material into the
GitHub secret `EC2_SSH_KEY` later.

### 2. Security group for the EC2 host

```powershell
$sgId = aws ec2 create-security-group `
  --group-name $sgName `
  --description "Arcado single-box: ssh + http + https" `
  --vpc-id $vpcId --region $region `
  --query "GroupId" --output text

aws ec2 authorize-security-group-ingress --group-id $sgId --region $region `
  --ip-permissions `
    "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=YOUR.OWN.IP.HERE/32}]" `
    "IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]" `
    "IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}]"
```

Replace `YOUR.OWN.IP.HERE/32` with your current public IP. You can open SSH to
`0.0.0.0/0` if you prefer but it's safer to lock it.

### 3. Let the EC2 SG talk to RDS

```powershell
aws ec2 authorize-security-group-ingress --group-id $rdsSgId --region $region `
  --protocol tcp --port 5432 --source-group $sgId
```

### 4. Launch the EC2 instance

```powershell
$instanceId = aws ec2 run-instances `
  --region $region `
  --image-id $amiId `
  --instance-type t3.small `
  --key-name $keyName `
  --security-group-ids $sgId `
  --subnet-id $subnetId `
  --associate-public-ip-address `
  --user-data file://deploy/ec2/bootstrap.sh `
  --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3}" `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=arcado}]" `
  --query "Instances[0].InstanceId" --output text

aws ec2 wait instance-running --instance-ids $instanceId --region $region
```

### 5. Allocate + attach an Elastic IP

```powershell
$allocId = aws ec2 allocate-address --domain vpc --region $region `
  --query "AllocationId" --output text
aws ec2 associate-address --instance-id $instanceId --allocation-id $allocId `
  --region $region
$eip = aws ec2 describe-addresses --allocation-ids $allocId --region $region `
  --query "Addresses[0].PublicIp" --output text
echo "EIP: $eip"
```

### 6. Point DNS at the EIP

In Route53, edit (or create) two A records in your `gagankumar.me` hosted zone:

| Name | Type | Value |
|---|---|---|
| `arcado.gagankumar.me` | A | `<EIP>` |
| `api.arcado.gagankumar.me` | A | `<EIP>` |

Wait ~60 seconds for DNS propagation before the first `docker compose up`, or
Caddy's first ACME attempt will fail and retry.

### 7. Provision the app on the box

Give the bootstrap script a minute to finish (`cloud-init` can take 2–3 min),
then SSH in:

```bash
ssh -i arcado-ec2.pem ubuntu@<EIP>

# once logged in:
cd /srv/arcado
git clone https://github.com/<you>/arcado.git .
cp deploy/ec2/.env.prod.example .env.prod
nano .env.prod                    # fill in real values
docker compose -f deploy/ec2/docker-compose.prod.yml \
               --env-file /srv/arcado/.env.prod \
               up -d --build
docker compose -f deploy/ec2/docker-compose.prod.yml logs -f
```

The first build pulls base images and compiles Next.js, which takes 4–8
minutes on t3.small. After that, incremental `up -d --build` is under a
minute for most changes.

### 8. Smoke test

```bash
curl -I https://arcado.gagankumar.me
curl https://api.arcado.gagankumar.me/health
```

Open the site in a browser, sign in, check that the Socket.IO connection
upgrades to `wss://api.arcado.gagankumar.me` in the network tab.

---

## CI/CD (GitHub Actions)

The workflow at `.github/workflows/deploy.yml` SSHes into the box on every
push to `main` and re-runs `git pull && docker compose up -d --build`. Add
these three secrets in **GitHub → Repo → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `EC2_HOST` | the Elastic IP (or the DNS name) |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | the **full contents** of `arcado-ec2.pem` including the `-----BEGIN/END-----` lines |

Trigger a manual run from the **Actions** tab to verify before merging any
real change.

---

## Re-deploying manually

From your laptop, on any branch:

```bash
ssh -i arcado-ec2.pem ubuntu@<EIP> \
  "cd /srv/arcado && git fetch --all && git checkout <branch> && \
   docker compose -f deploy/ec2/docker-compose.prod.yml --env-file /srv/arcado/.env.prod up -d --build"
```

---

## Running DB migrations

`prisma db push` from the box uses the same `.env.prod`:

```bash
ssh -i arcado-ec2.pem ubuntu@<EIP>
cd /srv/arcado
docker compose -f deploy/ec2/docker-compose.prod.yml run --rm \
  -e DATABASE_URL="$(grep ^DATABASE_URL .env.prod | cut -d= -f2-)" \
  server npx prisma db push --schema /app/db/prisma/schema.prisma
```

Or, if you'd rather run it from your laptop, temporarily allowlist your IP on
the RDS SG (same as the original runbook's step 5) and run
`pnpm --filter @arcado/db db:push` locally.

---

## Rolling back

`git checkout <previous-sha>` in `/srv/arcado` and re-run the compose command.
Image layers are cached, so rollback is usually under 60 seconds.

---

## Operational cheatsheet

```bash
# tail logs
docker compose -f deploy/ec2/docker-compose.prod.yml logs -f client
docker compose -f deploy/ec2/docker-compose.prod.yml logs -f server
docker compose -f deploy/ec2/docker-compose.prod.yml logs -f caddy

# restart a single container
docker compose -f deploy/ec2/docker-compose.prod.yml restart server

# disk cleanup (if the box fills up)
docker system prune -af --volumes

# see container resource use
docker stats --no-stream
```

---

## Notes & gotchas

- **Cold start after reboot**: Docker comes back up automatically, containers
  have `restart: unless-stopped`, so a reboot recovers on its own in ~30s.
- **Certificate renewal**: Caddy auto-renews. You don't have to think about it.
  If DNS ever changes, wait for Caddy to re-issue (or `docker compose restart caddy`).
- **Build OOMs on t3.small**: the bootstrap script adds a 2 GB swapfile, which
  keeps `next build` within budget. If you ever see an OOM anyway, bump the
  instance to `t3.medium` (~\$30/mo) and it'll vanish.
- **RDS still private**: the RDS security group now allows 5432 only from the
  EC2 SG. RDS is never exposed to the internet.
- **Backups**: RDS handles DB backups. For `.env.prod`, keep a copy in your
  password manager; everything else on the box is reproducible from git.
