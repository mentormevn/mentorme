const fs = require("fs");
const path = require("path");
try {
  require("dotenv").config();
} catch (error) {
  // dotenv is optional when env vars are already provided by the host.
}

const outputPath = path.join(__dirname, "public-config.js");

const config = {
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ""
};

const fileContent = `window.MENTOR_ME_CONFIG = ${JSON.stringify(config, null, 2)};\n`;

fs.writeFileSync(outputPath, fileContent, "utf8");
console.log("Generated public-config.js");
