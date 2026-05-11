# Step 4 – Wire up GitHub Actions CI/CD

`.github/workflows/deploy.yml` already exists in this repo. It runs on every
push to `main` and SSHes into the EC2 to `git pull && docker compose up -d --build`.

## Add three repo secrets

**GitHub → your repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `EC2_HOST` | the Elastic IP (e.g. `13.200.208.112`) |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | the **full contents** of `arcado-ec2.pem` including `-----BEGIN ... PRIVATE KEY-----` and `-----END ... PRIVATE KEY-----` |

On Windows you can read the file like this and copy to clipboard:

```powershell
Get-Content arcado-ec2.pem -Raw | Set-Clipboard
```

## Allow GitHub Actions runners to SSH in

GitHub runners rotate public IPs, so we can't lock SSH to a known CIDR. Two
options, pick one:

### Option A (easiest) — open port 22 to the world

```powershell
aws ec2 revoke-security-group-ingress --group-id $sgId --region $region `
  --protocol tcp --port 22 --cidr "$myIp/32"
aws ec2 authorize-security-group-ingress --group-id $sgId --region $region `
  --protocol tcp --port 22 --cidr 0.0.0.0/0
```

Combined with key-only auth (Ubuntu default) this is fine for a side
project. An SSH fail2ban-style setup is a nice-to-have but not urgent.

### Option B (tighter) — use GitHub's IP range and refresh it periodically

GitHub publishes the current runner IP ranges at
https://api.github.com/meta. It's ~2000 CIDRs and changes. Not worth it for
a side project; go with Option A.

## First CI run

Trigger manually: **Actions → "Deploy to EC2" → Run workflow**.

If it fails the first time, the most common causes are:

- Missing/truncated `EC2_SSH_KEY` — paste it again with the headers intact.
- SSH port blocked — see above.
- `git reset --hard origin/main` fails because `/srv/arcado` isn't a git
  checkout. Re-run Step 2 up to and including `git checkout -f main`.

## Verify

Make a trivial change in `client/`, push to `main`, watch the Actions tab.
Deploy completes in ~2 min for a cached build, ~5 min for a cold one.
