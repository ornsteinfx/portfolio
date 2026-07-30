let allItems = []
let currentSort = "newest"
let currentFilter = "all"

// ─── FETCH PORTFOLIO ───
async function fetchPortfolio() {
  const res = await fetch(`portfolio.json`)
  allItems = await res.json()
  sortItems()
  renderFilters()
  renderGallery()
}

function sortItems() {
  allItems.sort((a, b) => (currentSort === "oldest" ? a.date - b.date : b.date - a.date))
}

// ─── RENDER FILTER BUTTONS ───
function renderFilters() {
  const cats = [...new Set(allItems.map((i) => i.category))].sort()
  const filtersEl = document.getElementById("filters")
  filtersEl.innerHTML = ""

  const allBtn = document.createElement("button")
  allBtn.className = "filter-btn active"
  allBtn.dataset.filter = "all"
  allBtn.textContent = "All"
  allBtn.addEventListener("click", () => setFilter("all"))
  filtersEl.appendChild(allBtn)

  cats.forEach((cat) => {
    const btn = document.createElement("button")
    btn.className = "filter-btn"
    btn.dataset.filter = cat
    // Show short name for nested categories
    btn.textContent = cat.includes("/") ? cat.split("/").pop() : cat
    btn.title = cat
    btn.addEventListener("click", () => setFilter(cat))
    filtersEl.appendChild(btn)
  })
}

function setFilter(cat) {
  currentFilter = cat
  document.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === cat)
  })
  renderGallery()
}

// ─── RENDER GALLERY ───
function renderGallery() {
  const sections = document.getElementById("gallerySections")
  sections.innerHTML = ""

  const filtered = currentFilter === "all" ? allItems : allItems.filter((i) => i.category === currentFilter)

  if (currentFilter === "all") {
    // Group by category
    const groups = {}
    filtered.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    })

    // Sort categories by newest item in each
    const sortedCats = Object.keys(groups).sort((a, b) => {
      const aMax = Math.max(...groups[a].map((i) => i.date))
      const bMax = Math.max(...groups[b].map((i) => i.date))
      return bMax - aMax
    })

    sortedCats.forEach((cat) => {
      const section = document.createElement("div")
      section.className = "category-section"

      const title = document.createElement("h3")
      title.className = "category-title"
      title.innerHTML = `${cat} <span class="category-count">${groups[cat].length}</span>`
      section.appendChild(title)

      const grid = document.createElement("div")
      grid.className = "gallery"
      groups[cat].forEach((item, i) => {
        grid.appendChild(createGalleryItem(item, i))
      })
      section.appendChild(grid)
      sections.appendChild(section)
    })
  } else {
    const grid = document.createElement("div")
    grid.className = "gallery"
    grid.style.paddingTop = "0"
    filtered.forEach((item, i) => {
      grid.appendChild(createGalleryItem(item, i))
    })
    sections.appendChild(grid)
  }

  // Trigger stagger animation
  requestAnimationFrame(() => {
    document.querySelectorAll(".gallery-item").forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), 40 * i)
    })
  })
}

function createGalleryItem(item) {
  const el = document.createElement("div")
  el.className = "gallery-item"
  el.dataset.path = item.path
  const dateStr = new Date(item.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  el.innerHTML = `
    <img src="assets/${item.path}" alt="${item.name}" loading="lazy">
    <div class="gallery-overlay">
      <div>
        <div class="gallery-label">${item.name}</div>
        <div class="gallery-tag">${item.category}</div>
        <div class="gallery-date">${dateStr}</div>
      </div>
    </div>
  `
  el.addEventListener("click", () => openLightbox(`assets/${item.path}`, item.name))
  return el
}

// ─── LIGHTBOX ───
const lightbox = document.getElementById("lightbox")
const lightboxImg = document.getElementById("lightboxImg")
const lightboxClose = document.getElementById("lightboxClose")

function openLightbox(src, title) {
  lightboxImg.src = src
  lightboxImg.alt = title
  lightbox.classList.add("open")
  document.body.style.overflow = "hidden"
}

function closeLightbox() {
  lightbox.classList.remove("open")
  document.body.style.overflow = ""
}

lightboxClose.addEventListener("click", closeLightbox)
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox()
})
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox()
})

// ─── SORT ───
const sortBtn = document.getElementById("sortBtn")
const sortDropdown = document.getElementById("sortDropdown")

sortBtn.addEventListener("click", (e) => {
  e.stopPropagation()
  sortDropdown.classList.toggle("open")
})

document.addEventListener("click", () => sortDropdown.classList.remove("open"))

document.querySelectorAll(".sort-option").forEach((opt) => {
  opt.addEventListener("click", () => {
    currentSort = opt.dataset.sort
    document.querySelectorAll(".sort-option").forEach((o) => o.classList.remove("active"))
    opt.classList.add("active")
    sortBtn.childNodes[0].textContent = opt.textContent + " "
    sortDropdown.classList.remove("open")
    sortItems()
    renderGallery()
  })
})

// ─── NAV SCROLL ───
const nav = document.getElementById("nav")
let lastScroll = 0

window.addEventListener(
  "scroll",
  () => {
    const y = window.scrollY
    nav.classList.toggle("scrolled", y > 80)

    if (y > lastScroll && y > 200) {
      nav.classList.add("hidden")
    } else {
      nav.classList.remove("hidden")
    }
    lastScroll = y
  },
  { passive: true },
)

// ─── MOBILE MENU ───
const menuBtn = document.getElementById("menuBtn")
const mobileMenu = document.getElementById("mobileMenu")

menuBtn.addEventListener("click", () => {
  menuBtn.classList.toggle("open")
  mobileMenu.classList.toggle("open")
  document.body.style.overflow = mobileMenu.classList.contains("open") ? "hidden" : ""
})

document.querySelectorAll(".mobile-link").forEach((link) => {
  link.addEventListener("click", () => {
    menuBtn.classList.remove("open")
    mobileMenu.classList.remove("open")
    document.body.style.overflow = ""
  })
})

// ─── SCROLL REVEAL ───
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed")
        revealObserver.unobserve(entry.target)
      }
    })
  },
  { threshold: 0.15 },
)

document.querySelectorAll("[data-reveal]").forEach((el) => {
  revealObserver.observe(el)
})

// ─── HERO STAGGER ───
window.addEventListener("load", () => {
  document.querySelectorAll(".hero-line, .hero-sub, .hero-scroll").forEach((el, i) => {
    setTimeout(() => el.classList.add("revealed"), 200 + i * 150)
  })
})

// ─── ADMIN MODE ───
const ADMIN_PASSWORD = "Mjhornstein6!"
const REPO = "ornsteinfx/portfolio"
const BRANCH = "main"
const ASSETS_PREFIX = "docs/assets"

let adminMode = false
let gitToken = localStorage.getItem("gh_token") || ""

const adminStyles = document.createElement("style")
adminStyles.textContent = `
  .admin-badge {
    position: fixed; bottom: 24px; right: 24px; z-index: 999;
    font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba(0,0,0,0.15); pointer-events: none;
  }
  .admin-overlay { display: none; }
  .admin-mode .admin-overlay { display: flex; }
  .admin-mode .gallery-item { cursor: default; }
  .admin-mode .gallery-overlay { display: none !important; }
  .admin-del {
    position: absolute; top: 8px; right: 8px; z-index: 10;
    width: 28px; height: 28px; border-radius: 50%;
    background: rgba(211,47,47,0.9); color: #fff;
    border: none; cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s;
  }
  .admin-mode .gallery-item:hover .admin-del { opacity: 1; }
  .admin-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 200;
    background: #d32f2f; color: #fff; padding: 8px 40px;
    font-size: 12px; font-weight: 500; display: none;
    align-items: center; justify-content: space-between;
  }
  .admin-mode .admin-bar { display: flex; }
  .admin-bar button {
    background: rgba(255,255,255,0.2); color: #fff;
    border: none; padding: 4px 12px; border-radius: 4px;
    cursor: pointer; font-size: 11px; font-weight: 500;
  }
  .admin-bar button:hover { background: rgba(255,255,255,0.3); }
  .admin-upload {
    display: none; position: fixed; bottom: 80px; right: 24px;
    z-index: 199; background: #fff; border: 2px dashed #ccc;
    border-radius: 12px; padding: 24px; width: 320px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  }
  .admin-mode .admin-upload { display: block; }
  .admin-upload.dragover { border-color: #000; background: #f5f5f5; }
  .admin-upload p { font-size: 12px; color: #666; margin-bottom: 12px; text-align: center; }
  .admin-upload select {
    width: 100%; padding: 8px; font-size: 12px;
    border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px;
  }
  .admin-upload .upload-btn {
    width: 100%; padding: 10px; background: #000; color: #fff;
    border: none; border-radius: 4px; cursor: pointer; font-size: 12px;
  }
  .admin-upload .upload-btn:hover { opacity: 0.85; }
  .admin-toast {
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
    background: #000; color: #fff; padding: 10px 20px;
    border-radius: 100px; font-size: 13px; font-weight: 500;
    opacity: 0; transition: opacity 0.3s; z-index: 999; pointer-events: none;
  }
  .admin-toast.show { opacity: 1; }
  .admin-token-modal {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none; transition: opacity 0.3s;
  }
  .admin-token-modal.open { opacity: 1; pointer-events: all; }
  .admin-token-modal .modal-box {
    background: #fff; padding: 32px; border-radius: 12px;
    max-width: 420px; width: 90%;
  }
  .admin-token-modal h3 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
  .admin-token-modal p { font-size: 12px; color: #666; margin-bottom: 16px; line-height: 1.5; }
  .admin-token-modal input {
    width: 100%; padding: 10px 12px; font-size: 13px;
    border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px;
  }
  .admin-token-modal .btn-row { display: flex; gap: 8px; }
  .admin-token-modal button {
    padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 500;
    cursor: pointer; border: 1px solid #ddd; background: #fff;
  }
  .admin-token-modal .btn-primary { background: #000; color: #fff; border-color: #000; }
`
document.head.appendChild(adminStyles)

// Inject admin bar
const ab = document.createElement("div")
ab.className = "admin-bar"
ab.innerHTML = `ADMIN MODE <span><button id="adminPublishBtn">Publish Changes</button> <button id="adminExitBtn">Exit</button></span>`
document.body.prepend(ab)

// Inject upload widget
const au = document.createElement("div")
au.className = "admin-upload"
au.id = "adminUpload"
au.innerHTML = `
  <p>Drop images or click to browse</p>
  <select id="adminCat"></select>
  <input type="file" id="adminFileInput" multiple accept="image/*" style="display:none">
  <button class="upload-btn" id="adminBrowseBtn">Browse</button>
  <div id="adminUploadStatus" style="font-size:11px;color:#999;margin-top:8px;text-align:center"></div>
`
document.body.appendChild(au)

// Inject toast
const at = document.createElement("div")
at.className = "admin-toast"
at.id = "adminToast"
document.body.appendChild(at)

// Token modal
const tm = document.createElement("div")
tm.className = "admin-token-modal"
tm.id = "adminTokenModal"
tm.innerHTML = `
  <div class="modal-box">
    <h3>GitHub Token Required</h3>
    <p>To upload and delete photos, create a <a href="https://github.com/settings/tokens?type=fine-grained" target="_blank">fine-grained PAT</a> with <b>Contents: Read/Write</b> permission for <b>ornsteinfx/portfolio</b>. Paste it below (stored locally in your browser).</p>
    <input type="password" id="adminTokenInput" placeholder="github_pat_...">
    <div class="btn-row">
      <button class="btn-primary" id="adminTokenSave">Save Token</button>
      <button id="adminTokenCancel">Cancel</button>
    </div>
  </div>
`
document.body.appendChild(tm)

// Admin badge
const badge = document.createElement("div")
badge.className = "admin-badge"
badge.textContent = "admin: ctrl+shift+a"
document.body.appendChild(badge)

function adminToast(msg) {
  const t = document.getElementById("adminToast")
  t.textContent = msg
  t.classList.add("show")
  setTimeout(() => t.classList.remove("show"), 3000)
}

function getCatSelect() {
  const cats = [...new Set(allItems.map((i) => i.category))].sort()
  const sel = document.getElementById("adminCat")
  if (!sel) return
  sel.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join("")
}

async function ghApi(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${gitToken}`,
      Accept: "application/vnd.github+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

function enc(p) {
  return p.split("/").map(encodeURIComponent).join("/")
}

async function getSha(path) {
  try {
    const d = await ghApi("GET", `/repos/${REPO}/contents/${enc(path)}?ref=${BRANCH}`)
    return d.sha
  } catch {
    return null
  }
}

async function commitFile(path, content, msg) {
  const sha = await getSha(path)
  return ghApi("PUT", `/repos/${REPO}/contents/${enc(path)}`, {
    message: msg,
    content: btoa(content),
    sha: sha || undefined,
    branch: BRANCH,
  })
}

async function deleteFile(path, msg) {
  const sha = await getSha(path)
  if (!sha) return
  return ghApi("DELETE", `/repos/${REPO}/contents/${enc(path)}`, {
    message: msg,
    sha,
    branch: BRANCH,
  })
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result.split(",")[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

document.getElementById("adminBrowseBtn")?.addEventListener("click", () => {
  document.getElementById("adminFileInput")?.click()
})

document.getElementById("adminFileInput")?.addEventListener("change", async (e) => {
  const files = e.target.files
  if (!files.length) return
  const cat = document.getElementById("adminCat").value
  const status = document.getElementById("adminUploadStatus")
  for (const file of files) {
    status.textContent = `Uploading ${file.name}...`
    const b64 = await readFileAsBase64(file)
    const repoPath = `${ASSETS_PREFIX}/${cat.replace(/\/$/, "")}/${file.name}`
    try {
      await commitFile(repoPath, b64, `Upload ${file.name}`)
      adminToast(`Uploaded: ${file.name}`)
    } catch (err) {
      adminToast(`Failed: ${file.name} - ${err.message}`)
    }
  }
  status.textContent = "Done. Publishing changes..."
  document.getElementById("adminFileInput").value = ""
  await publishPortfolio()
})

// Drag & drop on upload widget
au.addEventListener("dragover", (e) => {
  e.preventDefault()
  au.classList.add("dragover")
})
au.addEventListener("dragleave", () => au.classList.remove("dragover"))
au.addEventListener("drop", async (e) => {
  e.preventDefault()
  au.classList.remove("dragover")
  const files = e.dataTransfer.files
  if (!files.length) return
  const cat = document.getElementById("adminCat").value
  const status = document.getElementById("adminUploadStatus")
  for (const file of files) {
    status.textContent = `Uploading ${file.name}...`
    const b64 = await readFileAsBase64(file)
    const repoPath = `${ASSETS_PREFIX}/${cat}/${file.name}`
    try {
      await commitFile(repoPath, b64, `Upload ${file.name}`)
      adminToast(`Uploaded: ${file.name}`)
    } catch (err) {
      adminToast(`Failed: ${file.name} - ${err.message}`)
    }
  }
  status.textContent = "Done. Publishing..."
  await publishPortfolio()
})

async function publishPortfolio() {
  const items = allItems.map((i) => ({
    name: i.name,
    path: i.path,
    category: i.category,
    date: i.date,
  }))
  const json = JSON.stringify(items)
  try {
    await commitFile("docs/portfolio.json", json, "Update portfolio.json")
    adminToast("Changes published! GitHub Pages will update in 1-2 min.")
  } catch (err) {
    adminToast(`Publish failed: ${err.message}`)
  }
}

// Add delete buttons
function addAdminUI() {
  document.querySelectorAll(".admin-del").forEach((el) => el.remove())
  document.querySelectorAll(".gallery-item").forEach((el) => {
    const del = document.createElement("button")
    del.className = "admin-del"
    del.textContent = "×"
    del.addEventListener("click", async (e) => {
      e.stopPropagation()
      const idx = allItems.findIndex((x) => x.path === el.dataset.path)
      if (idx === -1) return
      const item = allItems[idx]
      if (!confirm(`Delete "${item.name}"?`)) return
      allItems.splice(idx, 1)
      const repoPath = `${ASSETS_PREFIX}/${item.path}`
      try {
        await deleteFile(repoPath, `Delete ${item.path}`)
        adminToast("Deleted. Publishing...")
      } catch (err) {
        adminToast(`Delete from repo failed: ${err.message}`)
        allItems.splice(idx, 0, item)
        return
      }
      renderGallery()
      addAdminUI()
      getCatSelect()
      await publishPortfolio()
    })
    el.appendChild(del)
  })
  getCatSelect()
}

function enterAdmin() {
  adminMode = true
  document.body.classList.add("admin-mode")
  nav.style.top = "32px"
  adminToast("Admin mode active")
  addAdminUI()
}

function exitAdmin() {
  adminMode = false
  document.body.classList.remove("admin-mode")
  nav.style.top = ""
}

// Keyboard shortcut
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
    e.preventDefault()
    if (adminMode) {
      exitAdmin()
      return
    }
    const pw = prompt("Admin password:")
    if (pw === ADMIN_PASSWORD) {
      if (!gitToken) {
        document.getElementById("adminTokenModal").classList.add("open")
      } else {
        enterAdmin()
      }
    } else if (pw !== null) {
      alert("Wrong password")
    }
  }
})

document.getElementById("adminTokenSave")?.addEventListener("click", () => {
  const input = document.getElementById("adminTokenInput")
  gitToken = input.value.trim()
  if (!gitToken) return
  localStorage.setItem("gh_token", gitToken)
  document.getElementById("adminTokenModal").classList.remove("open")
  enterAdmin()
})

document.getElementById("adminTokenCancel")?.addEventListener("click", () => {
  document.getElementById("adminTokenModal").classList.remove("open")
})

document.getElementById("adminExitBtn")?.addEventListener("click", exitAdmin)

document.getElementById("adminPublishBtn")?.addEventListener("click", publishPortfolio)

// ─── INIT ───
fetchPortfolio()
