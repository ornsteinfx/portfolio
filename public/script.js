let allItems = []
let currentSort = "newest"
let currentFilter = "all"

// ─── FETCH PORTFOLIO ───
async function fetchPortfolio() {
  const res = await fetch(`/portfolio.json`)
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

function createGalleryItem(item, index) {
  const el = document.createElement("div")
  el.className = "gallery-item"
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

// ─── INIT ───
fetchPortfolio()
