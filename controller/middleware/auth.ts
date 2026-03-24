import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ขยาย Request ให้รองรับตัวแปร user
export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 1. ดึง Token ออกมาจาก Header ที่ชื่อว่า Authorization
  const authHeader = req.headers['authorization'];
  
  // รูปแบบมาตรฐานจะเป็น "Bearer <token_string>" เราจึงต้อง split แยกเอาแค่ตัว token
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: "Access Denied. ไม่มี Token ยืนยันตัวตน" });
  }

  try {
    // 2. ตรวจสอบบัตรว่าของจริงไหม หรือหมดอายุหรือยัง
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    
    // 3. ฝังข้อมูลผู้ใช้ (Payload) ลงไปใน Request เพื่อให้ API ถัดไปเอาไปใช้ต่อได้
    req.user = decoded; 
    
    // 4. บัตรผ่าน! เชิญเข้าไปทำ API ถัดไปได้
    next(); 
  } catch (error) {
    return res.status(403).json({ error: "Invalid Token. บัตรปลอม หรือหมดอายุแล้ว" });
  }
};