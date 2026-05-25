# AutoSLP REST & WebSocket API Contract Specification

All interface interactions with the AutoSLP gateway use type-safe JSON payloads, strict token matrices, and high-frequency binary/JSON websocket streams.

---

## 1. REST API OpenAPI Specifications

### Gateway Server Base URLs:
* Staging: `https://staging-api.autoslp.com/api/v1`
* Production: `https://api.autoslp.com/api/v1`

```yaml
openapi: 3.1.0
info:
  title: AutoSLP Edge-SMC Automation REST API
  version: 1.0.0
  description: High-performance low-latency market bias analyses, automated POI detection models, and order execution limits synchronization channels.
paths:
  /auth/register:
    post:
      summary: Register a new system account
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, username, password]
              properties:
                email: { type: string, format: email }
                username: { type: string, minLength: 3 }
                password: { type: string, format: password, minLength: 8 }
      responses:
        '201':
          description: User account registered successfully

  /auth/login:
    post:
      summary: Sign in and receive token matrices
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [username, password]
              properties:
                username: { type: string }
                password: { type: string }
      responses:
        '200':
          description: Authentication tokens verified
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: { type: string }
                  refreshToken: { type: string }
                  expiresIn: { type: integer, example: 900 }

  /auth/refresh:
    post:
      summary: Renew a transient access token
      headers:
        Authorization:
          description: Bearer Refresh Token
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Tokens refreshed

  /market/candles:
    get:
      summary: Retrieve historic chart candlesticks
      parameters:
        - name: pair
          in: query
          required: true
          schema: { type: string, example: "BTCUSDT" }
        - name: tf
          in: query
          required: true
          schema: { type: string, enum: ["5m", "15m", "30m", "1H", "4H", "1D"] }
        - name: limit
          in: query
          schema: { type: integer, default: 200 }
      responses:
        '200':
          description: Candle bucket matching queries returned

  /pois:
    get:
      summary: Retrieve current mapped POI blocks
      security:
        - BearerAuth: []
      parameters:
        - name: pair
          in: query
          schema: { type: string }
      responses:
        '200':
          description: Lists matches
    post:
      summary: Plot a new POI block overlay
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [pair, timeframe, type, priceFrom, priceTo]
              properties:
                pair: { type: string }
                timeframe: { type: string }
                type: { type: string, enum: ["ORDER_BLOCK", "BREAKER_BLOCK"] }
                priceFrom: { type: number }
                priceTo: { type: number }
      responses:
        '201':
          description: Block registered and plotted
```

---

## 2. Authentication Flow

AutoSLP uses dual-token JWT authentication:
1. **Access Token**: Short-lived (15 minutes). Sent in the `Authorization: Bearer <token>` header of every endpoints query.
2. **Refresh Token**: Long-lived (7 days). Stored client-side inside an `httpOnly`, secure, SameSite=Strict cookie or exchanged explicitly via `/auth/refresh` to fetch a new access token.

When your access token expires (returns a `401 Unauthorized` response with standard payload code `TOKEN_EXPIRED`), execute a request to `/auth/refresh` containing your refresh token.

---

## 3. Real-Time WebSockets Interface

Address: `/v1/realtime` (Secure namespace Socket.io)

### Common Message Subscriptions:

#### Client-side handshake registration:
```javascript
socket.emit('subscribe', {
  pairs: ['BTCUSDT', 'ETHUSDT'],
  events: ['candle', 'bias', 'signal', 'poi', 'alert']
});
```

#### Server-side Push Event Schemas:

* **Candle Update**:
```javascript
socket.on('candle_update', {
  pair: "BTCUSDT",
  tf: "1H",
  candle: { o: 64250.0, h: 64380.0, l: 64110.0, c: 64320.5, v: 184.2, ts: "2026-05-24T14:00:00.000Z", closed: false }
});
```

* **Automated Signal Hook**:
```javascript
socket.on('signal_created', {
  signalId: "90ca3470-8b1d-4eb4-b32c-6caedd80816a",
  pair: "BTCUSDT",
  direction: "LONG",
  entryFrom: 64200.0,
  entryTo: 64250.0,
  stopLoss: 63100.0,
  targets: [66800.0, 69200.0],
  reason: "MSS shift with body close inside support (M30 Order Block)"
});
```
