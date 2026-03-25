import express from "express";
import { conn } from "../dbconnect";
import { UserItem } from "../model/user_model";

import util from "util";
import { RowDataPacket } from "mysql2";
import { ResultSetHeader } from "mysql2/promise";
import jwt from "jsonwebtoken";
import { generateToken } from "../controller/middleware/auth"; // อิมพอร์ตมาจากไฟล์ศูนย์บัญชาการยาม
import bcrypt from "bcrypt";

export const queryAsync = util.promisify(conn.query).bind(conn);
export const router = express.Router();

router.get('/',(req,res)=>{
    res.send("Get in login.ts")
});

router.get("/users", async (req, res) => {
  try {
    const [rows] = await conn.query("SELECT * FROM `user` ");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

//หา id_user:
router.get("/users/:id",async(req,res)=>{
    try {
    const id = req.params.id;

    const [rows] = await conn.query("SELECT * FROM `user` WHERE uid = ?", [id]);

    res.json(rows);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ระบบ Login
router.post("/login", async (req, res) => {
  try {
    // 1. รับค่า username และ password 
    const { username, password } = req.body;

    // 2. ตรวจสอบเบื้องต้น
    if (!username || !password) {
      return res.status(400).json({ error: "กรุณากรอก username และ Password ให้ครบถ้วน" });
    }

    // 3. ค้นหาผู้ใช้ในฐานข้อมูลด้วย username (ฟิลด์ u_name)
    const [rows] : any = await conn.query("SELECT * FROM `user` WHERE u_name = ?", [username]);

    // 4. ถ้าหาไม่เจอ
    if (rows.length === 0) {
      return res.status(401).json({ error: "ชื่อผู้ใช้ หรือ รหัสผ่าน ไม่ถูกต้อง" }); 
    }

    const user = rows[0];

    // ==========================================
    // 🔐 5. เทียบรหัสผ่านด้วย bcrypt (จุดที่เปลี่ยนใหม่!)
    // ==========================================
    // ใช้ await bcrypt.compare(รหัสผ่านธรรมดา, รหัสผ่านที่เข้ารหัสแล้วใน DB)
    const isPasswordMatch = await bcrypt.compare(password, user.u_password);

    if (!isPasswordMatch) {
      return res.status(401).json({ error: "ชื่อผู้ใช้ หรือ รหัสผ่าน ไม่ถูกต้อง" });
    }

    // 6. ลบข้อมูลรหัสผ่านทิ้งเพื่อความปลอดภัย
    delete user.u_password;

    // ==========================================
    // 📌 เริ่มขั้นตอนสร้าง JWT Token
    // ==========================================
    
    // 7. สร้าง Payload 
    const payload = {
      uid: user.u_id,       // รหัสประจำตัวผู้ใช้ 
      username: user.u_name // ชื่อผู้ใช้
      // role: user.u_role  // ถ้ามีระบบ Admin ให้ใส่บรรทัดนี้เพิ่มเข้าไปด้วย
    };

    // 8. สร้าง Token (ใช้ฟังก์ชัน generateToken จากไฟล์ jwtauth ที่เราเพิ่งทำ)
    const token = generateToken(payload);

    console.log("✅ Login Success:", user.u_name);
    
    // 9. ส่งข้อความ, Token และข้อมูล User กลับไปให้หน้าแอป
    res.status(200).json({ 
      message: "เข้าสู่ระบบสำเร็จ",
      token: token, 
      user: user // เราส่ง object user ที่ถูกลบรหัสผ่านในข้อ 6 ออกไปได้เลย
    });
    
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ==========================================
// API เพิ่มผู้ใช้ใหม่ (POST /add)
// ==========================================
router.post("/add", async (req, res) => {
  try {
    // 1. Destructuring: ดึงตัวแปรออกมาตรงๆ เพื่อให้โค้ดอ่านง่ายและปลอดภัยขึ้น
    const { u_name, u_password, u_profile } = req.body as UserItem;

    // 2. Validation: ตรวจสอบว่าส่งข้อมูลสำคัญมาครบไหม
    if (!u_name || !u_password) {
      return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน" });
    }

    // 3. Security: เข้ารหัสผ่านด้วย bcrypt ก่อนเซฟลง Database (มาตรฐานสากล)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(u_password, saltRounds);

    // 4. จัดการค่าว่าง (เผื่อไม่ได้ส่งรูปโปรไฟล์มา ให้เป็นค่าว่างหรือ -)
    const profileData = u_profile || "-";

    // 5. Database Operation
    const sql = `
      INSERT INTO user (u_name, u_password, u_profile, u_role) 
      VALUES (?, ?, ?, 'user')
    `;
    
    // 💡 สังเกตว่าเราใช้ hashedPassword แทน u_password แบบเดิม
    const [rows] = await conn.query<ResultSetHeader>(sql, [
      u_name,
      hashedPassword, 
      profileData,
    ]);

    // 6. ส่งผลลัพธ์กลับไป (นิยมส่ง insertId กลับไปเผื่อ Frontend เอาไปทำอะไรต่อ)
    res.status(201).json({ 
      message: "สร้างบัญชีผู้ใช้สำเร็จ", 
      insertId: rows.insertId 
    });

  } catch (err: any) {
    console.error("❌ Add User Error:", err);

    // 7. Error Handling: ดักจับกรณี "ชื่อผู้ใช้ซ้ำ" ในฐานข้อมูล (MySQL Error Code 1062)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: "ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาใช้ชื่ออื่น" });
    }

    // เปลี่ยนจาก .send("...") เป็น .json({ ... }) เพื่อให้ Frontend รับผลง่ายขึ้น
    res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ในการบันทึกข้อมูล" });
  }
});

//edit user โดยใช้ id (update)
router.put("/update/:id", async (req, res) => {
  try {
    const user_id = req.params.id;
    const userDetail : UserItem = req.body; 

    if (!user_id) {
      return res.status(400).send("User ID not found");
    }

    // 1. ตรวจสอบ user เดิม (ใช้ uid ตามที่คุณเขียนมาตอนแรก)
    const selectSql = 'SELECT * FROM `user` WHERE uid = ?'; 
    const [rows] = await conn.execute<any[]>(selectSql, [user_id]);

    if (rows.length === 0) {
      return res.status(404).send("User not found");
    }

    const userOri = rows[0];

    let finalPassword = userOri.u_password; // ตั้งค่าเริ่มต้นเป็นรหัสผ่านเดิม (ที่เข้ารหัสแล้ว)

    // ถ้ามีการส่งรหัสผ่านใหม่เข้ามา และไม่ได้เป็นค่าว่าง
    if (userDetail.u_password && userDetail.u_password.trim() !== "") {
      const saltRounds = 10;
      finalPassword = await bcrypt.hash(userDetail.u_password, saltRounds); // เข้ารหัสผ่านใหม่
    }

    const updateUser = { ...userOri, ...userDetail 
      ,u_password: finalPassword
    };
    // 3. Update database โดยใช้แค่ 4 ฟิลด์ที่มีในตาราง
    const updateSql = `
      UPDATE user
      SET u_name = ?, u_password = ?, u_profile = ?, u_role = ?
      WHERE uid = ?
    `;
    
    const [result] = await conn.execute<any>(updateSql, [
      updateUser.u_name,
      updateUser.u_password,
      updateUser.u_profile,
      updateUser.u_role,
      user_id
    ]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "Update failed or Data is exactly the same" });
    }

    res.status(200).json({
      message: "Updated User Successfully",
      affectedRows: result.affectedRows
    });

  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).send("Database error");
  }
});

//delete user 
router.delete("/delete/:id", async(req,res)=>{
  try{
    const user_id = req.params.id;

    if(!user_id){
      return res.status(400).send("User not found");
    }

    const sql = "DELETE FROM user WHERE `uid` = ?";
    const [rows] = await conn.execute<ResultSetHeader>(sql,[user_id]);

    if(rows.affectedRows === 0){
      return res.status(404).json({ message : "User not found"});
    }
    res.status(200).json({
      message: "Delete User",
      affectedRows: rows.affectedRows
    });
  }catch(err){
    console.error(err);
    res.status(500).send("Database error");
  }
});

