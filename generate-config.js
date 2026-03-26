import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootOutputPath = path.join(__dirname, "public-config.js");
const publicDir = path.join(__dirname, "public");
const publicOutputPath = path.join(publicDir, "public-config.js");

const config = {
  SUPABASE_URL:
    process.env.SUPABASE_URL ||
    "https://gmyrnqupbqwbyaamixgv.supabase.co",
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdteXJucXVwYnF3YnlhYW1peGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTgzOTYsImV4cCI6MjA4OTk5NDM5Nn0.Q8EN6VzW6NG6hsMyOki5GjZsiWPfS0msjBesu6_gy6U"
};

const fileContent = `window.MENTOR_ME_CONFIG = ${JSON.stringify(config, null, 2)};\n`;

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(rootOutputPath, fileContent, "utf8");
fs.writeFileSync(publicOutputPath, fileContent, "utf8");
console.log("Generated public-config.js in root and public/");
