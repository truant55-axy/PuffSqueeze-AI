# PuffSqueeze PHP Backend (for Moodle MySQL)

## 1) Prepare environment

1. Copy `backend/.env.example` to `backend/.env`
2. Fill:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
   - `MOODLE_TABLE_PREFIX` (leave empty if no prefix)
   - `GEMINI_API_KEY`
   - `ALLOWED_ORIGIN` (frontend URL)

## 2) Create MySQL tables

Run:

```sql
SOURCE backend/sql/moodle_tables.sql;
```

Or copy SQL content manually into your Moodle MySQL database.

## 3) Start PHP backend locally

In project root:

```bash
php -S 0.0.0.0:8080 -t backend backend/index.php
```

## 4) Configure frontend API URL

In root `.env.local` set:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## 5) API list

- `GET /api/health`
- `POST /api/register`
- `POST /api/login`
- `POST /api/usage`
- `POST /api/squeeze-event`
- `POST /api/stress-record`
- `GET /api/dashboard?user_id=1`
- `POST /api/device-event`
- `POST /api/ai/chat`
- `GET /api/ai/suggestion?user_id=1`

## 6) Request examples

### Register

```json
{
  "email": "user@example.com",
  "display_name": "Alice",
  "password": "123456"
}
```

### Login

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

### Device event from M5StickC Plus

```json
{
  "user_id": 1,
  "device_id": "M5StickCPlus",
  "strike_level": "high",
  "strike_value": 89.5,
  "raw_data": {
    "accel_x": 0.31,
    "accel_y": 1.04,
    "accel_z": 0.87
  }
}
```

### Squeeze event (recommended for click/hardware hit)

```json
{
  "user_id": 1,
  "device_id": "M5StickCPlus",
  "strike_value": 87.2,
  "raw_data": {
    "accel_x": 0.31,
    "accel_y": 1.04,
    "accel_z": 0.87
  }
}
```

### Direct stress record from device algorithm

```json
{
  "user_id": 1,
  "stress_index": 64.5,
  "source": "m5stick_model_v1"
}
```

### Generic platform usage log

```json
{
  "user_id": 1,
  "action_type": "enter_home_screen",
  "action_detail": {
    "screen": "home",
    "duration_sec": 32
  }
}
```

### AI chat

```json
{
  "user_id": 1,
  "message": "I feel stressed now.",
  "history": [
    {
      "role": "user",
      "parts": [{ "text": "I had a bad day." }]
    }
  ],
  "strike_level": "high",
  "device_data": {
    "strike_value": 89.5,
    "device_id": "M5StickCPlus"
  }
}
```
