# AutoSLP Deployment Guide

AutoSLP can be deployed across local, staging, and production environments. This guide explains how to initialize core servers and scale Kubernetes pods in production.

---

## 1. Local Development Setup

### System Prerequisites:
* **Node.js**: v20+ (LTS recommended)
* **PostgreSQL**: v16+ (with TimescaleDB extension enabled)
* **Redis**: v7+

### Step-by-Step Installation:

1. **Clone the repository and install dependency bundles**:
   ```bash
   npm install
   ```

2. **Configure environment credentials**:
   Create a `.env` file at the root. See `.env.example` for details:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autoslp"
   REDIS_URL="redis://localhost:6379"
   JWT_ACCESS_SECRET="your_jwt_development_secret"
   JWT_REFRESH_SECRET="your_jwt_development_refresh_secret"
   BINANCE_API_KEY=""
   BINANCE_API_SECRET=""
   ```

3. **Bootstrap schema migrate runners via Prisma ORM**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Launch the local Vite + Fastify processes in sandbox mode**:
   ```bash
   npm run dev
   ```

---

## 2. CI/CD Staging Pipe Deployment

Every pull request or commit merged into the `staging` branch triggers `.github/workflows/deploy-staging.yml`.

### Staging Process:
1. Automated CI Lint, Unit, and Integration test sweeps complete successfully.
2. A staging Docker container is built containing the React frontend artifacts bundle and Fastify REST gateway.
3. Images are tagged with branch SHA and pushed to the secure registry instance.
4. Kubernetes rolls updates automatically onto the staging namespace:
   ```bash
   kubectl kustomize build ./k8s/overlays/staging | kubectl apply -f -
   ```

---

## 3. Production Deployment Kubernetes Stack

Production environments run on fully isolated Kubernetes clusters (`/k8s`). The layout comprises separate service layers, Horizontal Pod Autoscalers (HPA), external database integrations, and secured TLS gateways.

### Core Configuration Files (`/k8s`):
* `namespace.yaml`: Allocates the dedicated `autoslp` namespace wrapper.
* `secret.yaml`: Decrypts Vault environment variables (Prisma URLs, JWT sign keys).
* `configmap.yaml`: Holds static parameters (Binance exchange API configurations).
* `deployments/`: Contains declarations for `autoslp-frontend-deployment` and `autoslp-backend-deployment`.
* `services/`: Contains route exposure mappings (`ClusterIP` for backend services and frontend loadbalancers).
* `hpa.yaml`: Configures the Horizontal Pod Autoscalers, dynamically scaling pods between 3 to 20 based on CPU thresholds (> 70%).
* `ingress.yaml`: NGINX ingress routing controller binding safe TLS handshakes via cert-manager.

### Manual Multi-Node Production Launch Sequence:
```bash
# 1. Apply namespace configurations
kubectl apply -f ./k8s/namespace.yaml

# 2. Upload encryted secrets and config configurations
kubectl apply -f ./k8s/configmap.yaml
kubectl apply -f ./k8s/secret.yaml

# 3. Create services routing maps
kubectl apply -f ./k8s/services/

# 4. Trigger rolling update deployments
kubectl apply -f ./k8s/deployments/

# 5. Connect ingress routes and HPA scalers
kubectl apply -f ./k8s/ingress.yaml
kubectl apply -f ./k8s/hpa.yaml
```
