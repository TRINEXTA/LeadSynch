import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== STRUCTURE TABLE SUBSCRIPTIONS ===');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    console.log('=====================================\n');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('Erreur:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
