const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "public-config.js");

const config = {
  SUPABASE_URL:
    process.env.SUPABASE_URL ||
    "https://gmyrnqupbqwbyaamixgv.supabase.co",
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdteXJucXVwYnF3YnlhYW1peGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTgzOTYsImV4cCI6MjA4OTk5NDM5Nn0.Q8EN6VzW6NG6hsMyOki5GjZsiWPfS0msjBesu6_gy6U"
};

const fileContent = `window.MENTOR_ME_CONFIG = ${JSON.stringify(config, null, 2)};\n`;

fs.writeFileSync(outputPath, fileContent, "utf8");
console.log("Generated public-config.js");
