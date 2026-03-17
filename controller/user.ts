import express from "express";
import { conn } from "../dbconnect";
import { UserItem } from "../model/user_model";

import util from "util";
import { RowDataPacket } from "mysql2";
import { ResultSetHeader } from "mysql2/promise";


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
    // 1. รับค่า username และ password ที่ผู้ใช้พิมพ์ส่งมาจาก Client (เช่น Flutter)
    const { username, password } = req.body;

    // 2. ตรวจสอบเบื้องต้นว่าส่งข้อมูลมาครบหรือไม่
    if (!username || !password) {
      return res.status(400).json({ error: "กรุณากรอก username และ Password ให้ครบถ้วน" });
    }

    // 3. ค้นหาผู้ใช้ในฐานข้อมูลด้วย username
    // (ใช้ชื่อฟิลด์ u_name ตาม ER-Diagram ของคุณ)
    const [rows] : any = await conn.query("SELECT * FROM `user` WHERE u_name = ?", [username]);

    // 4. ถ้าหา email นี้ไม่เจอในระบบ
    if (rows.length === 0) {
      return res.status(401).json({ error: "อีเมล หรือ รหัสผ่าน ไม่ถูกต้อง" });
    }

    const user = rows[0];

    // 5. นำรหัสผ่านที่ส่งมา เทียบกับรหัสผ่านในฐานข้อมูล (u_password)
    if (user.u_password !== password) {
      return res.status(401).json({ error: "อีเมล หรือ รหัสผ่าน ไม่ถูกต้อง" });
    }

    // 6. ลบข้อมูลรหัสผ่านออกจาก Object ก่อนส่งกลับไปที่หน้าแอปเพื่อความปลอดภัย
    delete user.u_password;

    // 7. ส่งข้อมูลแจ้งเตือนว่า Login สำเร็จ พร้อมกับส่งข้อมูล User กลับไป
    res.json({ 
      message: "เข้าสู่ระบบสำเร็จ", 
      user: user 
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

//add user 
router.post("/add", async(req,res)=>{
  try{
    const user : UserItem  = req.body;
    
    const sql =`INSERT INTO user (u_name, u_password, u_profile, u_role) VALUES (?,?,?,'user')
    `;
    const [rows] = await conn.query<ResultSetHeader>(
          sql,
          [user.u_name,
           user.u_password,
           user.u_profile,
    ]);

    res.status(201).json({ message: "User created",row : rows.affectedRows });

  }catch(err){
    console.error(err);
    res.status(500).send("Database error");
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


    const updateUser = { ...userOri, ...userDetail };
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

