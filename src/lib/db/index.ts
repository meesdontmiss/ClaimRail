import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Disable prepared statements to stay compatible with pooled/serverless Postgres connections.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
})

// Create drizzle instance with schema
export const db = drizzle(client, { schema })

// Export schema for easy access
export { schema }
