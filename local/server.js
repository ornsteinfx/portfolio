const http = require("node:http")
const fs = require("node:fs")
const path = require("node:path")

const PORT = process.env.PORT || 3000
const PASSWORD = "Mjhornstein6!"
const ASSETS_DIR = path.join(__dirname, "assets")

let sessionToken = null

function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" })
  res.end(JSON.stringify(data))
}

function mime(file) {
  const ext = path.extname(file).toLowerCase()
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  }
  return types[ext] || "application/octet-stream"
}

function scanAssets(dir = ASSETS_DIR, prefix = "") {
  const items = []
  if (!fs.existsSync(dir)) return items
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue
    const fullPath = path.join(dir, entry.name)
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      items.push(...scanAssets(fullPath, relPath))
    } else {
      const s = fs.statSync(fullPath)
      const name = path.basename(entry.name, path.extname(entry.name))
      const category = prefix || "Uncategorized"
      items.push({ name, path: relPath, category, date: s.mtimeMs })
    }
  }
  return items
}

function scanCategories(dir = ASSETS_DIR) {
  const cats = new Set()
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue
    if (entry.isDirectory()) {
      const subEntries = fs.readdirSync(path.join(dir, entry.name), { withFileTypes: true })
      const hasFiles = subEntries.some((e) => e.isFile() && e.name !== ".DS_Store")
      if (hasFiles) cats.add(entry.name)
      for (const sub of subEntries) {
        if (sub.isDirectory()) {
          const nested = fs.readdirSync(path.join(dir, entry.name, sub.name), { withFileTypes: true })
          if (nested.some((e) => e.isFile() && e.name !== ".DS_Store")) {
            cats.add(`${entry.name}/${sub.name}`)
          }
        }
      }
    } else {
      cats.add("Uncategorized")
    }
  }
  return [...cats].sort()
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on("data", (c) => chunks.push(c))
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()))
      } catch {
        resolve(null)
      }
    })
    req.on("error", reject)
  })
}

function handleUpload(req, res) {
  const boundary = (req.headers["content-type"] || "").split("boundary=")[1]
  if (!boundary) return json(res, { error: "No boundary" }, 400)

  const chunks = []
  req.on("data", (c) => chunks.push(c))
  req.on("end", async () => {
    const buf = Buffer.concat(chunks)
    const parts = buf.toString("binary").split("--" + boundary)
    let fileData = null,
      fileName = null,
      category = "Uncategorized"

    for (const part of parts) {
      const headerEnd = part.indexOf("\r\n\r\n")
      if (headerEnd === -1) continue
      const header = part.substring(0, headerEnd)
      const body = part.substring(headerEnd + 4)
      if (header.includes('name="file"')) {
        const fnMatch = header.match(/filename="(.+?)"/)
        if (fnMatch) {
          fileName = fnMatch[1]
          fileData = Buffer.from(body.replace(/\r\n$/, ""), "binary")
        }
      }
      if (header.includes('name="category"')) {
        category = body.replace(/\r\n$/, "").trim()
      }
    }

    if (!fileData || !fileName) return json(res, { error: "No file" }, 400)
    const catDir = path.join(ASSETS_DIR, category)
    fs.mkdirSync(catDir, { recursive: true })
    fs.writeFileSync(path.join(catDir, fileName), fileData)
    json(res, { ok: true, path: `${category}/${fileName}` })
  })
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = decodeURIComponent(url.pathname)

  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") {
    res.writeHead(204)
    return res.end()
  }

  // API routes
  if (pathname === "/api/portfolio") {
    const items = scanAssets()
    const sort = url.searchParams.get("sort") || "newest"
    items.sort((a, b) => (sort === "oldest" ? a.date - b.date : b.date - a.date))
    return json(res, items)
  }

  if (pathname === "/api/categories") {
    return json(res, scanCategories())
  }

  if (pathname === "/api/auth" && req.method === "POST") {
    return parseBody(req).then((body) => {
      if (body?.password === PASSWORD) {
        sessionToken = Math.random().toString(36).slice(2)
        return json(res, { ok: true, token: sessionToken })
      }
      json(res, { error: "Wrong password" }, 401)
    })
  }

  if (pathname === "/api/upload" && req.method === "POST") {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${sessionToken}`) return json(res, { error: "Unauthorized" }, 401)
    return handleUpload(req, res)
  }

  if (pathname.startsWith("/api/delete/") && req.method === "DELETE") {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${sessionToken}`) return json(res, { error: "Unauthorized" }, 401)
    const filePath = pathname.replace("/api/delete/", "")
    try {
      fs.unlinkSync(path.join(ASSETS_DIR, filePath))
      return json(res, { ok: true })
    } catch {
      return json(res, { error: "File not found" }, 404)
    }
  }

  // Static files
  let filePath = pathname === "/" ? "/index.html" : pathname
  if (pathname === "/admin") filePath = "/admin.html"

  const fullPath = path.join(__dirname, filePath)
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const content = fs.readFileSync(fullPath)
    res.writeHead(200, { "Content-Type": mime(fullPath) })
    return res.end(content)
  }

  res.writeHead(404)
  res.end("Not found")
})

server.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`)
  console.log(`Admin panel at http://localhost:${PORT}/admin`)
})
