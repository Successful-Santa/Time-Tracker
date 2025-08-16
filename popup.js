// Download CSV functionality
function downloadCsvOfUsage() {
  chrome.storage.local.get(null, (items) => {
    loadCategoriesAndAssignments((categories, domainToCategory) => {
      const today = new Date().toISOString().slice(0, 10);
      const times = Object.entries(items)
        .filter(([key]) => key.endsWith("_" + today))
        .map(([key, ms]) => [key.replace("_" + today, ""), ms]);
      // Group by category
      const catToDomains = {};
      const uncategorized = [];
      for (const [domain, ms] of times) {
        const cat = domainToCategory[domain] || "Uncategorized";
        if (!catToDomains[cat]) catToDomains[cat] = [];
        catToDomains[cat].push({ domain, ms });
      }
      // Build CSV
      let csv = "Category,Domain,Time (h m s),Time (ms)\n";
      Object.entries(catToDomains).forEach(([cat, domains]) => {
        domains.forEach(({ domain, ms }) => {
          const timeStr = formatTime(ms);
          csv += `"${cat}","${domain}","${timeStr}",${ms}\n`;
        });
      });
      // Download
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `time-tracker-summary-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    });
  });
}
// popup.js: User-defined categories and domain assignment
function formatTime(ms) {
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / 60000) % 60;
  const hr = Math.floor(ms / 3600000);
  return `${hr}h ${min}m ${sec}s`;
}

const today = new Date().toISOString().slice(0, 10);

// Storage keys
const CATEGORIES_KEY = "categories";
const DOMAIN_TO_CATEGORY_KEY = "domainToCategory";

// UI elements
const addCategoryBtn = document.getElementById("addCategoryBtn");
const newCategoryName = document.getElementById("newCategoryName");
const domainInput = document.getElementById("domainInput");
const categorySelect = document.getElementById("categorySelect");
const assignDomainBtn = document.getElementById("assignDomainBtn");
const domainAssignments = document.getElementById("domainAssignments");
const closeManageBtn = document.getElementById("closeManageBtn");

// Load categories and domain assignments
function loadCategoriesAndAssignments(callback) {
  chrome.storage.local.get([CATEGORIES_KEY, DOMAIN_TO_CATEGORY_KEY], (data) => {
    const categories = data[CATEGORIES_KEY] || [];
    const domainToCategory = data[DOMAIN_TO_CATEGORY_KEY] || {};
    callback(categories, domainToCategory);
  });
}

// Load and display time by category
function displayTimeByCategory() {
  chrome.storage.local.get(null, (items) => {
    loadCategoriesAndAssignments((categories, domainToCategory) => {
      // Gather time per domain
      const times = Object.entries(items)
        .filter(([key]) => key.endsWith("_" + today))
        .map(([key, ms]) => [key.replace("_" + today, ""), ms]);

      // Group domains by category
      const catToDomains = {};
      const uncategorized = [];
      for (const [domain, ms] of times) {
        const cat = domainToCategory[domain] || null;
        if (cat) {
          if (!catToDomains[cat]) catToDomains[cat] = [];
          catToDomains[cat].push({ domain, ms });
        } else {
          uncategorized.push({ domain, ms });
        }
      }

      // Calculate total time per category
      const catTotals = {};
      for (const cat in catToDomains) {
        catTotals[cat] = catToDomains[cat].reduce((sum, d) => sum + d.ms, 0);
      }

      // Render categories
      let html = "";
      if (categories.length > 0) {
        categories.forEach((cat, idx) => {
          const total = formatTime(catTotals[cat] || 0);
          const domains = catToDomains[cat] || [];
          const sectionId = `cat-section-${idx}`;
          html += `<li style="margin-bottom:0.7em;">
            <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" class="category-header" data-section="${sectionId}">
              <span><b>${cat}</b>: ${total}</span>
              <span style="font-size:1.2em;">&#x25BC;</span>
            </div>
            <ul id="${sectionId}" class="category-domains" style="display:none;margin-top:0.5em;">
              ${domains
                .map(
                  ({ domain, ms }) =>
                    `<li style='display:flex;justify-content:space-between;'><span>${domain}</span><span>${formatTime(
                      ms
                    )}</span></li>`
                )
                .join("")}
            </ul>
          </li>`;
        });
      }
      // Render uncategorized
      html += `<li style="margin-bottom:0.7em;">
        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" class="category-header" data-section="uncat-section">
          <span><b>Uncategorized</b></span>
          <span style="font-size:1.2em;">&#x25BC;</span>
        </div>
        <ul id="uncat-section" class="category-domains" style="display:none;margin-top:0.5em;">
          ${uncategorized
            .map(
              ({ domain, ms }) =>
                `<li style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                  <span style="flex:1 1 auto;">${domain}: ${formatTime(
                  ms
                )}</span>
                  <select class="inlineCategorySelect" data-domain="${domain}" style="min-width:90px;">
                    <option value="">Uncategorized</option>
                    ${categories
                      .map((c) => `<option value="${c}">${c}</option>`)
                      .join("")}
                  </select>
                </li>`
            )
            .join("")}
        </ul>
      </li>`;
      if (categories.length === 0 && uncategorized.length === 0) {
        html = "<li>No data yet.</li>";
      }
      const categoryList = document.getElementById("categoryList");
      if (categoryList) categoryList.innerHTML = html;

      // Add expand/collapse logic
      document.querySelectorAll(".category-header").forEach((header) => {
        header.addEventListener("click", function () {
          const sectionId = this.getAttribute("data-section");
          const section = document.getElementById(sectionId);
          if (section) {
            section.style.display =
              section.style.display === "none" ? "block" : "none";
            // Toggle arrow
            const arrow = this.querySelector("span:last-child");
            if (arrow) {
              arrow.innerHTML =
                section.style.display === "none" ? "&#x25BC;" : "&#x25B2;";
            }
          }
        });
      });

      // Add event listeners for inline assignment (uncategorized only)
      document.querySelectorAll(".inlineCategorySelect").forEach((select) => {
        select.addEventListener("change", function () {
          const domain = this.getAttribute("data-domain");
          const cat = this.value;
          chrome.storage.local.get([DOMAIN_TO_CATEGORY_KEY], (data) => {
            let domainToCategory = data[DOMAIN_TO_CATEGORY_KEY] || {};
            if (cat) {
              domainToCategory[domain] = cat;
            } else {
              delete domainToCategory[domain];
            }
            chrome.storage.local.set(
              { [DOMAIN_TO_CATEGORY_KEY]: domainToCategory },
              () => {
                displayTimeByCategory();
              }
            );
          });
        });
      });
    });
  });
}
// Add category
document.addEventListener("DOMContentLoaded", () => {
  displayTimeByCategory();
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  const newCategoryName = document.getElementById("newCategoryName");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  if (addCategoryBtn && newCategoryName) {
    addCategoryBtn.onclick = function () {
      const name = newCategoryName.value.trim();
      if (!name) return;
      chrome.storage.local.get([CATEGORIES_KEY], (data) => {
        let categories = data[CATEGORIES_KEY] || [];
        if (!categories.includes(name)) {
          categories.push(name);
          chrome.storage.local.set({ [CATEGORIES_KEY]: categories }, () => {
            newCategoryName.value = "";
            displayTimeByCategory();
          });
        } else {
          displayTimeByCategory();
        }
      });
    };
  }
  if (downloadCsvBtn) {
    downloadCsvBtn.onclick = downloadCsvOfUsage;
  }
});

addCategoryBtn.onclick = function () {
  const name = newCategoryName.value.trim();
  if (!name) return;
  chrome.storage.local.get([CATEGORIES_KEY], (data) => {
    let categories = data[CATEGORIES_KEY] || [];
    if (!categories.includes(name)) {
      categories.push(name);
      chrome.storage.local.set({ [CATEGORIES_KEY]: categories }, () => {
        newCategoryName.value = "";
        displayTimeByCategory();
      });
    } else {
      displayTimeByCategory();
    }
  });
};
