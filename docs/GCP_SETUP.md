# GCP Free-Tier Deployment — One-Time Setup

## Prerequisites
- Google account with billing enabled (required even for free tier)
- `gcloud` CLI installed locally
- Your repo pushed to GitHub

---

## 1. Create the GCP Project

```bash
gcloud projects create findash-prod --name="FinDash Production"
gcloud config set project findash-prod
gcloud billing projects link findash-prod --billing-account=BILLING_ACCOUNT_ID
```

> Get your billing account ID: `gcloud billing accounts list`

Enable the Compute Engine API:
```bash
gcloud services enable compute.googleapis.com
```

---

## 2. Create the e2-micro VM (Always-Free tier)

The free tier applies to **one** e2-micro instance per month in `us-central1`, `us-east1`, or `us-west1`.

```bash
gcloud compute instances create findash-vm \
  --project=findash-prod \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --tags=http-server
```

---

## 3. Open Port 80 (Firewall Rule)

```bash
gcloud compute firewall-rules create allow-http \
  --project=findash-prod \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:80 \
  --target-tags=http-server
```

---

## 4. Get the VM's Public IP

```bash
gcloud compute instances describe findash-vm \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

Save this IP — you'll use it in `.env.prod` and the GitHub secrets.

> Note: The IP is ephemeral (changes on VM restart). Upgrade to a static IP if you need persistence:
> `gcloud compute addresses create findash-ip --region=us-central1`

---

## 5. SSH into the VM and Install Docker

```bash
gcloud compute ssh findash-vm --zone=us-central1-a
```

Once inside the VM:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 6. Clone the Repo and Create the Production Env File

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/findash.git
cd findash

# Create .env.prod from the example
cp .env.prod.example .env.prod
nano .env.prod
```

Fill in `.env.prod`:
- Replace `YOUR_VM_IP` with the IP from step 4
- Set strong values for `DB_PASSWORD` and `JWT_SECRET`
- Set `API_IMAGE` and `WEB_IMAGE` to your actual GHCR paths (e.g. `ghcr.io/your-username/findash/api:latest`)
- Add Google OAuth credentials if needed

---

## 7. Set Up GitHub Actions Secrets

Go to **GitHub → Your Repo → Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `VM_HOST` | VM public IP from step 4 |
| `VM_USER` | Your VM SSH username (e.g. `caspe`) |
| `VM_SSH_KEY` | Contents of your SSH private key (see below) |
| `GHCR_TOKEN` | GitHub PAT with `read:packages` scope (see below) |

### Generate an SSH key pair for CI/CD

Run this on your **local machine** (not the VM):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/findash_deploy
```

Add the **public** key to the VM:
```bash
gcloud compute instances add-metadata findash-vm \
  --zone=us-central1-a \
  --metadata=ssh-keys="YOUR_VM_USER:$(cat ~/.ssh/findash_deploy.pub)"
```

Add the **private** key (`cat ~/.ssh/findash_deploy`) as the `VM_SSH_KEY` secret in GitHub.

### Create a GitHub PAT for GHCR pull access

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Generate new token with scope: `read:packages`
3. Add it as the `GHCR_TOKEN` secret

---

## 8. First Manual Deploy (Bootstrap)

Before CI/CD kicks in, start the stack manually on the VM:

```bash
# On the VM
cd ~/findash

# Login to GHCR (use the same PAT as GHCR_TOKEN)
echo "YOUR_GHCR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull and start
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Check everything is running:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api
```

The app should be accessible at `http://YOUR_VM_IP`.

---

## 9. CI/CD — Automatic Deploys

From now on, every push to `main` will:
1. Build the API and Web Docker images
2. Push them to GHCR
3. SSH into the VM and restart the services with the new images

Watch the progress in **GitHub → Actions**.

---

## Useful Commands (on the VM)

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart a single service
docker compose -f docker-compose.prod.yml restart api

# Run database migrations manually
docker compose -f docker-compose.prod.yml exec api /app/apps/api/entrypoint.sh

# Stop everything
docker compose -f docker-compose.prod.yml down
```
