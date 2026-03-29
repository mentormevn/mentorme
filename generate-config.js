const fs = require("fs");
const path = require("path");
const localEnv = {};
try {
  require("dotenv").config();
} catch (error) {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split(/\r?\n/).forEach(function (line) {
      const trimmed = String(line || "").trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex < 0) {
        return;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (key) {
        localEnv[key] = value;
      }
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
  }
}

const outputPath = path.join(__dirname, "public-config.js");

const config = {
  SUPABASE_URL: process.env.SUPABASE_URL || localEnv.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || localEnv.SUPABASE_ANON_KEY || ""
};

const fileContent = `window.MENTOR_ME_CONFIG = ${JSON.stringify(config, null, 2)};\n`;

fs.writeFileSync(outputPath, fileContent, "utf8");
console.log("Generated public-config.js");
