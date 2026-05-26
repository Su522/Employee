const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function init() {
  console.log('Connecting to MySQL server...');
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Database: ${process.env.DB_NAME}`);

  // 1. Connect without database name first to create it
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  });

  console.log('Successfully connected to MySQL. Creating database if not exists...');
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'scheduling_db'}\`;`);
  await connection.query(`USE \`${process.env.DB_NAME || 'scheduling_db'}\`;`);

  console.log('Reading schema.sql...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Executing schema.sql...');
  await connection.query(schemaSql);
  console.log('Schema tables created successfully.');

  // 2. Seed initial data if Employee table is empty
  const [rows] = await connection.query('SELECT COUNT(*) as count FROM Employee');
  if (rows[0].count === 0) {
    console.log('Seeding initial employees...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    await connection.query(
      `INSERT INTO Employee (name, email, password, level, hourly_wage, join_date) VALUES 
      ('張小明', 'ming@example.com', ?, 'senior', 220, '2025-01-15'),
      ('李美華', 'hua@example.com', ?, 'junior', 200, '2025-02-10'),
      ('王大衛', 'david@example.com', ?, 'senior', 220, '2025-03-05')`,
      [hashedPassword, hashedPassword, hashedPassword]
    );
    console.log('Seed data inserted successfully.');
  } else {
    console.log('Employee table is not empty. Skipping seed data.');
  }

  // 3. Seed default settings into ScheduleSource if empty
  const [settingRows] = await connection.query('SELECT COUNT(*) as count FROM ScheduleSource');
  if (settingRows[0].count === 0) {
    console.log('Seeding default settings into ScheduleSource...');
    await connection.query(`
      INSERT INTO ScheduleSource (setting_key, setting_value) VALUES
      ('wages_junior', '200'),
      ('wages_senior', '220'),
      ('staffing_morning', '2'),
      ('staffing_afternoon', '1'),
      ('staffing_evening', '2'),
      ('constraints_maxHours', '20'),
      ('constraints_consecutiveShiftsAllowed', 'false'),
      ('constraints_seniorRequiredPerShift', 'true');
    `);
    console.log('Default settings seeded successfully.');
  } else {
    console.log('ScheduleSource settings table is not empty. Skipping seed data.');
  }

  await connection.end();
  console.log('Database initialization completed successfully!');
}

init().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
