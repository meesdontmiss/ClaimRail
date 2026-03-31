import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create postgres client from connection string
const client = postgres(process.env.DATABASE_URL!)

// Create drizzle instance with schema
export const db = drizzle(client, { schema })

// Export schema for easy access
export { schema }
