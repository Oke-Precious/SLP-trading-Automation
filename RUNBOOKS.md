# AutoSLP Algorithmic Solutions — Standard Runbooks

This master index defines operational, failover, disaster recovery, and restore playbooks.

---

## Service Level Agreements (SLA)
* **RPO (Recovery Point Objective)**: 24 Hours absolute maximum data loss window.
* **RTO (Recovery Time Objective)**: 2 Hours maximum duration to restore service continuity.

---

## Playbook 1: PostgreSQL Full database Disaster Recovery Restore
**Context**: Executed if Database volumes experience localized or region-wide absolute failures.
**Interval Tested**: Monthly.

### Step-by-Step Recovery Procedure:

1. **Isolate and scale active traffic servers down** to avoid lock contention and stale write attempts during restore procedures:
   ```bash
   kubectl scale deployment/autoslp-backend-deployment --replicas=0 -n autoslp
   ```

2. **Locate the correct backup snapshot** uploaded to the secure, encrypted Amazon S3 target cluster (`s3://autoslp-db-archive-backups/`):
   ```bash
   # List the latest AES-256 encrypted production snaps
   aws s3 ls s3://autoslp-db-archive-backups/production/
   ```

3. **Download the targets snapshot** to the restore staging volume:
   ```bash
   aws s3 cp s3://autoslp-db-archive-backups/production/db-snapshot-2026-05-25.sql.gz.enc ./db-restore.sql.gz.enc
   ```

4. **Decrypt the downloaded backups archive** using your cluster's vault decrypt parameters:
   ```bash
   openssl enc -d -aes-256-cbc -salt -in db-restore.sql.gz.enc -out db-restore.sql.gz -pass pass:${BACKUP_DECRYPTION_SECRET}
   gunzip db-restore.sql.gz
   ```

5. **Execute schema wipe and load tasks** onto the target active Postgres pod instance:
   ```bash
   # Extract running active pod identifiers
   export REG_POSTGRES_POD=$(kubectl get pods -n autoslp -l app=autoslp-postgres -o jsonpath="{.items[0].metadata.name}")

   # Wipe previous corrupted schemas cleanly
   kubectl exec -i $REG_POSTGRES_POD -n autoslp -- psql -U postgres -d autoslp -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

   # Stream the decrypted clean SQL backup inside the pod database instance
   kubectl exec -i $REG_POSTGRES_POD -n autoslp -- psql -U postgres -d autoslp < db-restore.sql
   ```

6. **Trigger PostgreSQL Point-In-Time recovery (PITR)** to stream pending WAL logs and reconstruct transactional histories up to execution failure timeline:
   ```bash
   kubectl exec -it $REG_POSTGRES_POD -n autoslp -- touch /var/lib/postgresql/data/recovery.signal
   ```

7. **Verify data tables structure matches expectations**, then reconstruct backend server deployments:
   ```bash
   kubectl scale deployment/autoslp-backend-deployment --replicas=3 -n autoslp
   ```

---

## Playbook 2: Rolling back deployment versions with Zero Downtime
**Context**: Executed if active staging or production deployments exhibit performance regressions, latency leaks, or software regression errors after a launch.

1. **Verify active rollout histories** to identify current stable version targets:
   ```bash
   kubectl rollout history deployment/autoslp-backend-deployment -n autoslp
   ```

2. **Perform immediate cluster rollbacks** to revert deployment pods to their immediate previous configuration safely with zero downtime:
   ```bash
   # Revert backend configurations
   kubectl rollout undo deployment/autoslp-backend-deployment -n autoslp

   # Revert frontend configurations
   kubectl rollout undo deployment/autoslp-frontend-deployment -n autoslp
   ```

3. **Verify rollout status and monitor metric dashboards** to guarantee regression termination:
   ```bash
   kubectl rollout status deployment/autoslp-backend-deployment -n autoslp
   ```

---

## Playbook 3: Redis Cache Rebuild & Database Re-seeding
**Context**: Executed on Redis node crash recovery, or if cache objects get corrupted and require purging.

1. **Purge all keys safely** on the cache engine to avoid stale state retention:
   ```bash
   # Connect to active cluster Redis and execute cache purge
   export REDIS_POD=$(kubectl get pods -n autoslp -l app=redis -o jsonpath="{.items[0].metadata.name}")
   kubectl exec -it $REDIS_POD -n autoslp -- redis-cli flushall
   ```

2. **Trigger Database re-seed workers** to crawl the primary db and initialize cache instances with active user permissions, API states, and dynamic 2FA sessions:
   ```bash
   # Trigger seed task manually on backend container
   export BACK_POD=$(kubectl get pods -n autoslp -l app=autoslp-backend -o jsonpath="{.items[0].metadata.name}")
   kubectl exec -it $BACK_POD -n autoslp -- npm run cache:reseed
   ```

3. **Inspect metrics gauges** to verify active sessions populate Redis completely:
   ```bash
   curl -s http://api.autoslp.com/metrics | grep autoSLP_ws_connections_active
   ```

---

## Playbook 4: Binance High-Speed WebSocket Connection Manual Rekindling
**Context**: Executed if Binance stream sockets experience silent rate freezes or connection loops.

1. **Signal backend processes via custom runtime endpoint** to sever current stale feed listeners and start fresh handshakes:
   ```bash
   # Securely dispatch local trigger request to WebSocket managers
   curl -X POST \
     -H "Authorization: Bearer ${MANAGEMENT_SECRET_API_TOKEN}" \
     -H "Content-Type: application/json" \
     https://api.autoslp.com/api/v1/ws/reconnect
   ```

2. **Verify live subscription rates via metrics output** to ensure message streams are flowing:
   ```bash
   # Ensure messages ingested increments actively over time
   for i in {1..5}; do curl -s https://api.autoslp.com/metrics | grep autoSLP_candles_ingested_total; sleep 2; done
   ```

---

## Playbook 5: Chaos Engineering & Fault Tolerance Sandbox testing
**Context**: Executed monthly to guarantee cluster resiliency.

* **Kill Active Pod Instance**: Randomly delete a backend container, ensuring the replica controller spawns a replacement pod within 5 seconds with zero service impact.
  ```bash
  kubectl delete pod $(kubectl get pods -n autoslp -l app=autoslp-backend -o jsonpath="{.items[0].metadata.name}") -n autoslp
  ```
* **Database Disconnection Fault Verification**: Simulate transient network drops on PostgreSQL instances and verify that Fastify's Prisma client triggers reconnect logic under 2000 milliseconds.
* **Autoscaling verification**: Flood endpoints with simulated request loads to verify that HPAs scale pod limits flawlessly from 3 up to 20 replica pods.
