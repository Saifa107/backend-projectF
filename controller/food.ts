import express from "express";
import { conn } from "../dbconnect";
import { IngredientItem } from "../model/Ingredient_Item";

import util from "util";
import { RowDataPacket } from "mysql2";
import { ResultSetHeader } from "mysql2/promise";


export const queryAsync = util.promisify(conn.query).bind(conn);
export const router = express.Router();

// ==========================================
// Get food แสดงอาหารทั้งหมด
// ==========================================
router.get("/", async (req, res) => {
  try {

    const sql = "SELECT * FROM `food` ";
    const [rows] = await conn.query<any[]>(sql);

    if (rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบข้อมูลเมนูอาหารนี้" });
    }

    res.status(200).json(rows[0]);

  } catch (error) {
    console.error("❌ Get Food Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});
// ==========================================
// รับ ID แล้วแสดงข้อมูลเมนูอาหาร (GET by ID)
// ==========================================
router.get("/:id", async (req, res) => {
  try {
    const food_id = req.params.id;

    const sql = "SELECT * FROM `food` WHERE food_id = ?";
    const [rows] = await conn.query<any[]>(sql, [food_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบข้อมูลเมนูอาหารนี้" });
    }

    res.status(200).json(rows[0]);

  } catch (error) {
    console.error("❌ Get Food Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ==========================================
// เพิ่มเมนูอาหารใหม่ (POST)
// ==========================================
router.post("/add", async (req, res) => {
  try {
    const { food_name, food_description, food_image , food_type_id } = req.body;

    // ตรวจสอบว่าส่งข้อมูลสำคัญมาครบหรือไม่ (บังคับชื่อเมนู)
    if (!food_name) {
      return res.status(400).json({ error: "กรุณาส่งชื่อเมนูอาหาร (food_name)" });
    }

    const sql = `
      INSERT INTO food (food_name, food_description, food_image , food_type_id) 
      VALUES (?, ?, ?, ?)
    `;
    
    const [result] = await conn.query<ResultSetHeader>(sql, [
      food_name,
      food_description || "-", // ถ้าไม่มีรายละเอียด ให้ใส่ "-"
      food_image || "-"  ,      // ถ้าไม่มีรูป ให้ใส่ "-"
      food_type_id
    ]);

    res.status(201).json({ 
      message: "เพิ่มเมนูอาหารสำเร็จ", 
      insertId: result.insertId 
    });

  } catch (error) {
    console.error("❌ Insert Food Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  }
});

// ==========================================
// แก้ไขข้อมูลเมนูอาหาร โดยใช้ ID (PUT Update)
// ==========================================
router.put("/update/:id", async (req, res) => {
  try {
    const food_id = req.params.id;
    const updateData = req.body;

    // 3.1 ตรวจสอบข้อมูลเดิม
    const selectSql = "SELECT * FROM `food` WHERE food_id = ?";
    const [rows] = await conn.query<any[]>(selectSql, [food_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบข้อมูลเมนูอาหารที่ต้องการแก้ไข" });
    }

    const foodOri = rows[0];

    // 3.2 ดึงข้อมูลใหม่มาทับข้อมูลเดิม (Partial Update)
    // รองรับการส่ง key แบบสั้นๆ เช่น name, description, image หรือชื่อเต็ม
    const food_name = updateData.food_name || updateData.name || foodOri.food_name;
    const food_description = updateData.food_description || updateData.description || foodOri.food_description;
    const food_image = updateData.food_image || updateData.image || foodOri.food_image;
    const food_type_id  = updateData.food_type_id || updateData.food_type_id || foodOri.food_type_id;

    // 3.3 บันทึกลง Database
    const updateSql = `
      UPDATE food 
      SET food_name = ?, food_description = ?, food_image = ? ,food_type_id = ?
      WHERE food_id = ?
    `;
    
    const [result] = await conn.execute<ResultSetHeader>(updateSql, [
      food_name,
      food_description,
      food_image,
      food_type_id,
      food_id
    ]);

    res.status(200).json({ 
      message: "อัปเดตข้อมูลเมนูอาหารสำเร็จ",
      affectedRows: result.affectedRows 
    });

  } catch (error) {
    console.error("❌ Update Food Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
  }
});

// ==========================================
// ลบข้อมูลเมนูอาหาร (DELETE)
// ==========================================
router.delete("/delete/:id", async (req, res) => {
  try {
    const food_id = req.params.id;

    const sql = "DELETE FROM `food` WHERE food_id = ?";
    const [result] = await conn.execute<ResultSetHeader>(sql, [food_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบข้อมูลเมนูอาหาร หรือถูกลบไปแล้ว" });
    }

    res.status(200).json({ 
      message: "ลบเมนูอาหารสำเร็จ" 
    });

  } catch (error) {
    console.error("❌ Delete Food Error:", error);
    res.status(500).json({ error: "ไม่สามารถลบได้ เนื่องจากข้อมูลนี้อาจถูกใช้งานอยู่" });
  }
});

// ==========================================
// แสดงข้อมูลประเภทอาหารทั้งหมด (GET All Types)
// ==========================================
router.get("/types/all", async (req, res) => {
  try {
    // คำสั่ง SQL ดึงข้อมูลทั้งหมดจากตาราง ingredient_type
    // (เปลี่ยนชื่อตารางให้ตรงกับในฐานข้อมูลของคุณ ถ้าใช้ชื่ออื่น)
    const sql = "SELECT * FROM `typeFood`"; 
    
    // ใช้ conn.query เพื่อดึงข้อมูลออกมาเป็น Array
    const [rows] = await conn.query<any[]>(sql);

    // เช็คว่ามีข้อมูลในตารางหรือไม่
    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลประเภทวัตถุดิบ" });
    }

    // ส่งข้อมูลกลับไปให้ Frontend ในรูปแบบ JSON
    res.status(200).json(rows);

  } catch (error) {
    console.error("❌ Get Ingredient Types Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลประเภทวัตถุดิบ" });
  }
});

// ==========================================
// เพิ่มส่วนประกอบของอาหาร (Bulk Insert)
// ==========================================
router.post("/add-components", async (req, res) => {
  try {
    const { food_id, ingredient_ids } = req.body;

    // 1. ตรวจสอบข้อมูลว่าส่งมาครบและถูกต้องไหม
    if (!food_id) {
      return res.status(400).json({ error: "กรุณาส่งรหัสเมนูอาหาร (food_id)" });
    }
    if (!Array.isArray(ingredient_ids) || ingredient_ids.length === 0) {
      return res.status(400).json({ error: "กรุณาส่งรหัสวัตถุดิบ (ingredient_ids) เป็น Array ที่มีข้อมูล" });
    }

    // 2. แปลงข้อมูลให้เป็นรูปแบบ Array ซ้อน Array สำหรับ Bulk Insert
    // ผลลัพธ์ที่ได้จะเป็นแบบนี้: [ [1, 1], [1, 2] ] (สมมติ food_id=1, ingredient_ids=[1,2])
    const values = ingredient_ids.map((ing_id) => [food_id, ing_id]);

    // 3. คำสั่ง SQL สำหรับบันทึกหลายบรรทัดพร้อมกัน
    // ใช้เครื่องหมาย ? ตัวเดียวสำหรับครอบ Array ทั้งชุด
    // (หมายเหตุ: เปลี่ยนชื่อตารางและคอลัมน์ให้ตรงกับ DB ของคุณ ถ้าไม่ได้ใช้ชื่อ food_component และ ing_id)
    const sql = "INSERT INTO `food_component` (food_id, ing_id) VALUES ?";

    // ใช้ conn.query แทน execute สำหรับคำสั่ง Bulk Insert ที่มีโครงสร้างแบบนี้
    const [result] = await conn.query<ResultSetHeader>(sql, [values]);

    res.status(201).json({ 
      message: "เพิ่มส่วนประกอบของอาหารสำเร็จ!",
      insertedRows: result.affectedRows // แจ้งเตือนว่าเพิ่มไปกี่บรรทัด
    });

  } catch (error) {
    console.error("❌ Add Food Components Error:", error);

    // ดักจับ Error กรณีที่ส่ง ing_id ซ้ำกับที่มีอยู่แล้ว (ถ้าตั้งค่า Primary Key คู่ไว้)
    if ((error as any).code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "มีวัตถุดิบบางรายการถูกเพิ่มในเมนูนี้ไปแล้ว" });
    }

    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลส่วนประกอบอาหาร" });
  }
});