# Firebase Security Specification (`security_spec.md`)

This security specification details the authorization models, data invariants, and defensive validation patterns governing authorization on our Firebase Firestore DB.

## 1. Data Invariants

- **Ownership Isolation**: A user can only access, retrieve, edit, write, or delete their own data (`users`, `pois`, `alerts`, `signals`, `feedbacks`).
- **Profile Lockdown**: No user can assign themselves `plan: "ENTERPRISE"` or `plan: "PREMIUM"` upon creation. They can only create their profile with `plan: "FREE"`.
- **System Integrity (Timestamps & IDs)**: All timestamp fields like `createdAt` and `updatedAt` are strictly synchronized to `request.time` (the server's internal time), avoiding client tamper and malicious shifts.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads represent targeted injection attempts to breach database boundaries, all of which will be blocked and return `PERMISSION_DENIED` under the new security rules.

1. **User Profile Hijacking**: Attempt to create/update `/users/attacker_id` with `plan: "ENTERPRISE"` manually.
2. **Identity Spoofing**: Attempt to insert `/pois/poi_123` with `userId: "victim_id"` while logged in as `attacker_id`.
3. **Ghost Fields Injection**: Sending a POI update with arbitrary payload like `{ status: "Mitigated", isPrivilegedOverride: true }` to circumvent parameters.
4. **ID Poisoning**: Writing a POI with a massive document ID containing junk/extended unicode symbols to induce memory exhaustion.
5. **PII Reading Violation**: Authenticated user trying to read user document profile belonging to another user id.
6. **Anonymity Lockout**: Attempting to create data records, alerts, or queries without a valid Google/Verified authentication context.
7. **Temporal Fraud**: Setting `createdAt` of a document to `2100-01-01T00:00:00Z` instead of standard `request.time`.
8. **Negative Risk Settings**: Attempting to set `defaultRiskPercentage` to `-50` or `1050%` inside preferences.
9. **Arbitrary Status Change**: Direct change of alerts status to a system state from unverified operations.
10. **Signal Rating Leak**: Reading other users' signal logs or feedback submissions.
11. **Blanket Query Scraping**: Demanding listing of all zones `/pois` globally without filtering by the active authenticated user's ID.
12. **Denial of Wallet Recursion**: Injects highly nested objects to trick database query validators.

---

## 3. The Rules Architecture (`firestore.rules`)

The companion `firestore.rules` enforces the authorization boundaries outlined above.
