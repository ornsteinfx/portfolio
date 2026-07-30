const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const assetsDir = "docs/assets"
const exts = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"])
const items = []

function visit(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (full === assetsDir) continue
    if (e.isDirectory()) {
      visit(full)
    } else if (e.isFile() && exts.has(path.extname(e.name).toLowerCase())) {
      const rel = path.relative(assetsDir, full)
      const name = path.parse(e.name).name
      const cat = path.dirname(rel) === "." ? "Uncategorized" : path.dirname(rel)
      let date = Date.now()
      try {
        const out = execSync(`git log -1 --format="%at" -- "${full}"`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "ignore"],
        }).trim()
        if (out) date = parseInt(out) * 1000
      } catch {}
      items.push({ name, path: rel, category: cat, date })
    }
  }
}

visit(assetsDir)
items.sort((a, b) => b.date - a.date)
fs.writeFileSync("docs/portfolio.json", JSON.stringify(items))
console.log(`Generated portfolio.json with ${items.length} items`)
