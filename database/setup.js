const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'scip.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

function runSqlFile(db, filePath) {
  return new Promise((resolve, reject) => {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    db.exec(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function setupDatabase() {
  console.log('Setting up SCIP database...');
  
  // Remove existing database if it exists
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Removed existing database file.');
  }
  
  const db = new sqlite3.Database(DB_PATH);
  
  try {
    console.log('Creating schema...');
    await runSqlFile(db, SCHEMA_PATH);
    console.log('Schema created successfully.');
    
    console.log('Seeding data...');
    await runSqlFile(db, SEED_PATH);
    console.log('Data seeded successfully.');
    
    console.log(`Database setup complete! Database file: ${DB_PATH}`);
    
    // Display summary
    db.all('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (!err) console.log(`Users: ${row.count}`);
    });
    
    db.all('SELECT COUNT(*) as count FROM complaints', (err, row) => {
      if (!err) console.log(`Complaints: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

setupDatabase();
