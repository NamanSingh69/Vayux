# Local setup

## Prerequisites

- Docker with Docker Compose

## Configure the environment

```bash
cp .env.example .env
```

Set `DATA_GOV_IN_API_KEY` in `.env`. The local defaults can remain:

```dotenv
DATABASE_URL=postgresql://vayux:vayux@localhost:5432/vayux
DATA_GOV_IN_API_KEY=your_data_gov_in_api_key
NASA_FIRMS_KEY=
ATMOSPHERIC_ENGINE_URL=http://localhost:8000
```

`NASA_FIRMS_KEY` is optional; the atmospheric engine uses fallback fire data when
it is not set.

## Start the development services

```bash
docker compose up --build
```

This starts PostgreSQL, automatically applies the current Drizzle schema, then
starts the reloadable Next.js site on port 3000. The reloadable FastAPI atmospheric
engine runs on port 8000; check it at
[http://localhost:8000/health](http://localhost:8000/health).

Open [http://localhost:3000](http://localhost:3000).

## Stop the development services

```bash
docker compose down
```
