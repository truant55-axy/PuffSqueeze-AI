# PuffSqueeze AI (Frontend + PHP Backend for Moodle)

This project now includes:

- Frontend: `Vite + React + TypeScript`
- Backend: `PHP` (`backend/`)
- Database: `MySQL` (Moodle database, custom tables)

## Quick start

1. Install frontend dependencies
   - `npm install`
2. Set frontend env
   - copy `.env.example` to `.env.local`
   - set `VITE_API_BASE_URL=http://localhost:8080`
3. Set backend env
   - copy `backend/.env.example` to `backend/.env`
4. Create database tables
   - execute SQL in `backend/sql/moodle_tables.sql` (table names are without `mdl_` prefix)
5. Start PHP backend
   - `php -S 0.0.0.0:8080 -t backend backend/index.php`
6. Start frontend
   - `npm run dev`

## Backend docs

See [backend/README.md](backend/README.md) for API details and request samples.
