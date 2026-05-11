# Step 3 – DNS cutover on Namecheap (quick-swap)

Your DNS is hosted on Namecheap. The subdomain `arcado.gagankumar.me` might
be managed either in Namecheap's **Advanced DNS** tab (most common) or
delegated to another provider. Commands below assume Namecheap Advanced DNS.

## What you're changing

You currently have two A records pointing at the ALB's hostname:

| Host | Current value |
|---|---|
| `arcado.gagankumar.me` | CNAME or ALIAS → `arcado-alb-1141837951.ap-south-1.elb.amazonaws.com` |
| `api.arcado.gagankumar.me` | CNAME or ALIAS → `arcado-alb-1141837951.ap-south-1.elb.amazonaws.com` |

You're going to change them to:

| Host | Record | Value |
|---|---|---|
| `arcado.gagankumar.me` | **A** | `<EIP>` (e.g. `13.200.208.112`) |
| `api.arcado.gagankumar.me` | **A** | `<EIP>` |

Use the EIP your new EC2 is attached to (`$eip` from Step 1).

## Quick-swap flow (minimal downtime)

### a. Lower TTL first (do this as soon as you finish Step 1)

Drop TTL to the lowest Namecheap allows — that way caches flush fast when
you cut over.

1. Log in → **Domain List** → **Manage** next to `gagankumar.me`.
2. Tab: **Advanced DNS**.
3. Find both Arcado records. Click the pencil to edit → TTL → **1 min** (60 s).
4. Click the green check ✓ on each row to save.

Namecheap honours a minimum of 60 seconds. **Wait as long as the current
TTL was set to** (usually ~30 min) so stale caches expire. If you've never
changed it, the default is 30 min.

### b. Cut over

1. Deploy Step 2 and verify the app is running on the EC2 (step 2's smoke
   test on `localhost`).
2. Back in Namecheap Advanced DNS, edit each Arcado record:
   - Type → **A Record**
   - Host → `arcado` or `api.arcado`
   - Value → your EIP (e.g. `13.200.208.112`)
   - TTL → **1 min**
3. Save both.

DNS propagates in about 60–120 s with TTL at 1 min.

### c. Verify propagation

```powershell
# From your laptop — should return the EIP within ~90 s of the edit.
nslookup arcado.gagankumar.me
nslookup api.arcado.gagankumar.me

# Or from a public resolver, bypassing your ISP cache:
nslookup arcado.gagankumar.me 1.1.1.1
```

### d. Watch Caddy obtain certificates

```bash
ssh -i arcado-ec2.pem ubuntu@$eip
docker compose -f /srv/arcado/deploy/ec2/docker-compose.prod.yml logs -f caddy
```

You should see `certificate obtained successfully` for both hostnames within
~30 s of DNS propagating. If you see Let's Encrypt **rate-limit** errors,
uncomment the `acme_ca` line in `deploy/ec2/Caddyfile` to use the staging
CA while you iterate, then switch back.

### e. End-to-end smoke test

```powershell
curl -I https://arcado.gagankumar.me
curl https://api.arcado.gagankumar.me/health
```

Then open `https://arcado.gagankumar.me` in a browser, sign in with Google
or GitHub, and confirm the network tab shows `wss://api.arcado.gagankumar.me`
connecting.

### f. Raise TTL back up after 24 h

Once the new stack is stable, bump TTL back to **30 min** so browsers cache
the A record and you hit Namecheap's DNS servers less.

---

At this point the new stack is live and serving production traffic. The ALB
is still running in parallel but nothing is pointing at it — teardown in
Step 5.

Next: wire up CI/CD (Step 4), then tear down the old infra (Step 5).
