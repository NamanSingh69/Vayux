# Local setup

## Prerequisites

- Node.js 20+
- npm
- Docker with Docker Compose

## Install dependencies

```bash
npm install
```

## Configure the environment

```bash
cp .env.example .env
```

Set `DATA_GOV_IN_API_KEY` in `.env`. The default local database value can remain:

```dotenv
DATABASE_URL=postgresql://vayux:vayux@localhost:5432/vayux
DATA_GOV_IN_API_KEY=your_data_gov_in_api_key
```

## Start PostgreSQL

```bash
docker compose up -d
```

## Apply the database schema

```bash
npm run db:push
```

## Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stop PostgreSQL

```bash
docker compose down
```
