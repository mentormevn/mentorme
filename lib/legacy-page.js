import fs from "node:fs/promises";
import path from "node:path";

const HTML_ROOT = process.cwd();
const COMMON_SCRIPT_SRCS = new Set([
  "public-config.js",
  "/public-config.js",
  "main.js",
  "/main.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
]);

function normalizeScriptSrc(src) {
  if (!src) {
    return "";
  }

  if (/^https?:\/\//i.test(src)) {
    return src.trim();
  }

  const trimmed = src.trim().replace(/^\.\//, "");
  return trimmed.startsWith("/") ? trimmed : "/" + trimmed;
}

function isCommonScript(src) {
  const normalized = normalizeScriptSrc(src);
  return COMMON_SCRIPT_SRCS.has(src) || COMMON_SCRIPT_SRCS.has(normalized);
}

function parseLegacyHtml(html) {
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);

  if (!bodyMatch) {
    throw new Error("Legacy page is missing a body tag.");
  }

  const bodyAttributes = bodyMatch[1] || "";
  const bodyClassMatch = bodyAttributes.match(/class=(["'])(.*?)\1/i);
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const scripts = [];
  const content = bodyMatch[2].replace(scriptPattern, function stripScript(_, attributes, inlineCode) {
    const srcMatch = attributes.match(/src=(["'])(.*?)\1/i);
    const src = srcMatch ? srcMatch[2].trim() : "";

    if (src && isCommonScript(src)) {
      return "";
    }

    if (src) {
      scripts.push({
        src: normalizeScriptSrc(src),
        content: ""
      });
      return "";
    }

    if (inlineCode.trim()) {
      scripts.push({
        src: "",
        content: inlineCode.trim()
      });
    }

    return "";
  });

  return {
    title: titleMatch ? titleMatch[1].trim() : "Mentor Me",
    bodyClass: bodyClassMatch ? bodyClassMatch[2].trim() : "",
    content: content.trim(),
    scripts
  };
}

export async function getLegacyPageBySlug(slug) {
  const normalizedSlug = slug || "index";
  const filePath = path.join(HTML_ROOT, normalizedSlug + ".html");

  try {
    const html = await fs.readFile(filePath, "utf8");
    return parseLegacyHtml(html);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function listLegacyPageSlugs() {
  const entries = await fs.readdir(HTML_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html") && entry.name !== "index.html")
    .map((entry) => entry.name.replace(/\.html$/i, ""))
    .sort();
}
