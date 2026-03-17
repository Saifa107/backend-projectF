import express from "express";
import { router as user } from "./controller/user";
import { router as ingredient } from "./controller/ingredient";
import { router as food } from "./controller/food";
import { router as foodmark } from "./controller/foodmark";
import { router as images } from "./controller/images";
import { router as uability } from "./controller/uability";

export const app = express();

import bodyParser from "body-parser";
import * as os from "os"; 
import cors from "cors";

app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(cors({
  origin: "*", // หรือกำหนด domain frontend
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

//controller 
app.use("/", user);
app.use("/ingredient",ingredient);
app.use("/food",food);
app.use("/foodmark",foodmark);
app.use("/images",images);
app.use("/uability",uability);

// หา IP ของเครื่อง
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const localIP = getLocalIP();

const PORT = 3000;

//คำสั่งรันserver npx nodemon server.ts

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://${localIP}:${PORT}/`);
  console.log(`Login route: http://localhost:${PORT}/`);
  console.log(`Register route: http://localhost:${PORT}/register`);
});