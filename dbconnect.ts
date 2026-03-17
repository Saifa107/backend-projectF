import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config(); // โหลดค่าจากไฟล์ .env

export const conn = createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || '191.101.230.103',
    user: process.env.DB_USER || 'root',
    // ✅ เปลี่ยนให้ตรงกับในไฟล์ .env
    password: process.env.DB_PASSWORD || '', 
    database: process.env.DB_NAME || 'test_db',
    
    // ช่วยป้องกันการหลุด (ETIMEDOUT)
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});
