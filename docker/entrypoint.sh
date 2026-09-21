#!/bin/sh
set -eu

resolve_db_host() {
  if [ -n "${DATABASE_URL:-}" ]; then
    node -e "const u = new URL(process.env.DATABASE_URL); console.log(u.hostname || 'postgres');"
    return
  fi
  echo "${DB_HOST:-${POSTGRES_HOST:-postgres}}"
}

resolve_db_port() {
  if [ -n "${DATABASE_URL:-}" ]; then
    node -e "const u = new URL(process.env.DATABASE_URL); console.log(String(u.port || 5432));"
    return
  fi
  echo "${DB_PORT:-${POSTGRES_PORT:-5432}}"
}

DB_HOST="$(resolve_db_host)"
DB_PORT="$(resolve_db_port)"

echo "Esperando PostgreSQL en ${DB_HOST}:${DB_PORT}..."
while ! node -e "const net=require('net'); const host=process.argv[1]; const port=Number(process.argv[2]); const socket=net.connect({host, port}); socket.on('connect',()=>process.exit(0)); socket.on('error',()=>process.exit(1));" "$DB_HOST" "$DB_PORT"; do
  sleep 2
done

echo "Aplicando migraciones de Prisma..."
npx prisma migrate deploy

echo "Iniciando la aplicación..."
exec npm run start:prod
