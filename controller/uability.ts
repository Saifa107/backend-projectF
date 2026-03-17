import express from "express";
import { conn } from "../dbconnect";
import { UserItem } from "../model/user_model";

import util from "util";
import { RowDataPacket } from "mysql2";
import { ResultSetHeader } from "mysql2/promise";


export const queryAsync = util.promisify(conn.query).bind(conn);
export const router = express.Router();


// ==========================================
// API เพิ่มวัตถุดิบเข้าคลังของผู้ใช้ (POST /add-inventory)
// ==========================================
router.post("/add-inventory", async (req, res) => {
  try {
    // 1. รับค่าแค่ uid และ ing_id
    const { uid, ing_id } = req.body;

    // ตรวจสอบว่าส่งข้อมูลมาครบหรือไม่
    if (!uid || !ing_id) {
      return res.status(400).json({ error: "กรุณาส่งรหัสผู้ใช้ (uid) และ รหัสวัตถุดิบ (ing_id)" });
    }

    // 2. เช็คว่าผู้ใช้คนนี้เคยเพิ่มวัตถุดิบชิ้นนี้ในคลังไปแล้วหรือยัง?
    const checkSql = "SELECT * FROM `user_ingredient` WHERE u_id = ? AND ing_id = ?";
    const [existingRows]: any = await conn.query(checkSql, [uid, ing_id]);

    if (existingRows.length > 0) {
      // ถ้ามีอยู่แล้ว ให้ตอบกลับไปว่ามีแล้ว (ใช้ Status 400 หรือ 409 ก็ได้ครับ)
      return res.status(400).json({ 
        message: "วัตถุดิบนี้มีอยู่ในคลังของคุณแล้ว",
        action: "exists"
      });
    }

    // 3. ถ้ายังไม่มี ให้ทำการ Insert บรรทัดใหม่
    const insertSql = `
      INSERT INTO \`user_ingredient\` (u_id, ing_id) 
      VALUES (?, ?)
    `;
    
    // บันทึกลงฐานข้อมูล
    const [result] = await conn.execute<ResultSetHeader>(insertSql, [uid, ing_id]);

    res.status(201).json({ 
      message: "เพิ่มวัตถุดิบเข้าคลังสำเร็จ!",
      action: "inserted",
      insertId: result.insertId
    });

  } catch (error) {
    console.error("❌ Add Inventory Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกคลังวัตถุดิบ" });
  }
});

// ==========================================
// API แสดงวัตถุดิบในคลังของผู้ใช้ (GET /inventory/:uid)
// ==========================================
// ใช้ :uid เป็น Parameter เพื่อระบุว่าต้องการดูคลังของใคร
router.get("/inventory/:uid", async (req, res) => {
  try {
    // 1. ดึงรหัสผู้ใช้จาก URL (เช่น /inventory/1 จะได้ uid = 1)
    const uid = req.params.uid;

    if (!uid) {
      return res.status(400).json({ error: "กรุณาระบุรหัสผู้ใช้ (uid)" });
    }

    // 2. คำสั่ง SQL แบบ JOIN 2 ตารางเข้าด้วยกัน
    // ui คือ user_ingredient (ตารางคลัง)
    // i  คือ ingredient (ตารางข้อมูลวัตถุดิบหลัก)
    const sql = `
      SELECT 
        i.ing_id, 
        i.ing_name, 
        i.ing_image, 
        i.ing_detail, 
        i.ing_type_id
      FROM user_ingredient ui
      JOIN ingredient i ON ui.ing_id = i.ing_id
      WHERE ui.u_id = ?
    `;

    // 3. ดึงข้อมูลจาก Database
    const [rows]: any = await conn.query(sql, [uid]);

    // 4. ส่งข้อมูลกลับไปให้ Frontend
    // ถ้าไม่มีข้อมูล (คลังว่าง) rows จะเป็น [] (Array ว่าง) ซึ่งถือว่าถูกต้อง
    res.status(200).json({
      message: "ดึงข้อมูลคลังวัตถุดิบสำเร็จ",
      total_items: rows.length, // บอกจำนวนวัตถุดิบทั้งหมดที่มีในคลัง
      data: rows                // ส่งรายการวัตถุดิบทั้งหมดไป
    });

  } catch (error) {
    console.error("❌ Get Inventory Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลคลังวัตถุดิบ" });
  }
});