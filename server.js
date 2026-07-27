const PORT = 3000
const PASSWORD = "Mjhornstein6!"
const ASSETS_DIR = "./assets"

import { readdir, stat, mkdir, rename, unlink, writeFile, readFile } from "node:fs/promises"
import { join, extname, basename } from "node:path"

let sessionToken = null

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function mime(file) {
  const ext = extname(file).toLowerCase()
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

async function scanAssets(dir = ASSETS_DIR, prefix = "") {
  const items = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue
    const fullPath = join(dir, entry.name)
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      items.push(...(await scanAssets(fullPath, relPath)))
    } else {
      const s = await stat(fullPath)
      const name = basename(entry.name, extname(entry.name))
      const category = prefix || "Uncategorized"
      items.push({ name, path: relPath, category, date: s.mtimeMs })
    }
  }
  return items
}

async function scanCategories(dir = ASSETS_DIR) {
  const cats = new Set()
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue
    if (entry.isDirectory()) {
      const subEntries = await readdir(join(dir, entry.name), { withFileTypes: true })
      const hasFiles = subEntries.some((e) => e.isFile() && e.name !== ".DS_Store")
      if (hasFiles) cats.add(entry.name)
      for (const sub of subEntries) {
        if (sub.isDirectory()) {
          const nested = await readdir(join(dir, entry.name, sub.name), { withFileTypes: true })
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

async function handleUpload(req) {
  const formData = await req.formData()
  const file = formData.get("file")
  const category = formData.get("category") || "Uncategorized"

  if (!file) return json({ error: "No file" }, 400)

  const catDir = join(ASSETS_DIR, category)
  await mkdir(catDir, { recursive: true })
  const dest = join(catDir, file.name)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(dest, buffer)

  return json({ ok: true, path: `${category}/${file.name}` })
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const path = decodeURIComponent(url.pathname)

    // API routes
    if (path === "/api/portfolio") {
      const items = await scanAssets()
      const sort = url.searchParams.get("sort") || "newest"
      items.sort((a, b) => (sort === "oldest" ? a.date - b.date : b.date - a.date))
      return json(items)
    }

    if (path === "/api/categories") {
      return json(await scanCategories())
    }

    if (path === "/api/auth" && req.method === "POST") {
      const body = await req.json().catch(() => null)
      if (body?.password === PASSWORD) {
        sessionToken = Math.random().toString(36).slice(2)
        return json({ ok: true, token: sessionToken })
      }
      return json({ error: "Wrong password" }, 401)
    }

    if (path === "/api/upload" && req.method === "POST") {
      const auth = req.headers.get("authorization")
      if (auth !== `Bearer ${sessionToken}`) return json({ error: "Unauthorized" }, 401)
      return handleUpload(req)
    }

    if (path.startsWith("/api/delete/") && req.method === "DELETE") {
      const auth = req.headers.get("authorization")
      if (auth !== `Bearer ${sessionToken}`) return json({ error: "Unauthorized" }, 401)
      const filePath = path.replace("/api/delete/", "")
      try {
        await unlink(join(ASSETS_DIR, filePath))
        return json({ ok: true })
      } catch {
        return json({ error: "File not found" }, 404)
      }
    }

    if (path === "/api/rename" && req.method === "POST") {
      const auth = req.headers.get("authorization")
      if (auth !== `Bearer ${sessionToken}`) return json({ error: "Unauthorized" }, 401)
      const body = await req.json().catch(() => null)
      if (!body?.oldPath || !body?.newName) return json({ error: "Missing params" }, 400)
      const oldFull = join(ASSETS_DIR, body.oldPath)
      const dir = join(ASSETS_DIR, body.oldPath.substring(0, body.oldPath.lastIndexOf("/")))
      const ext = extname(body.oldPath)
      const newFull = join(dir, body.newName + ext)
      try {
        await rename(oldFull, newFull)
        return json({ ok: true })
      } catch {
        return json({ error: "Rename failed" }, 500)
      }
    }

    // Static files
    let filePath = path === "/" ? "/index.html" : path
    if (path === "/admin") filePath = "/admin.html"

    try {
      const file = Bun.file(join(import.meta.dir, filePath))
      if (await file.exists()) {
        return new Response(file, { headers: { "Content-Type": mime(filePath) } })
      }
    } catch {}

    return new Response("Not found", { status: 404 })
  },
})

console.log(`Portfolio running at http://localhost:${server.port}`)
console.log(`Admin panel at http://localhost:${server.port}/admin`)
