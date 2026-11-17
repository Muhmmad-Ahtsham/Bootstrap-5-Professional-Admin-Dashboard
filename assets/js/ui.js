"use strict";

/* =====================================================================
   ui.js - small shared helpers: escaping, alerts, pagination, notices
   ===================================================================== */

const UI = (function () {
  const BADGE_COLORS = ["primary", "success", "info", "warning", "danger", "secondary"];

  // Everything that comes from localStorage is untrusted text: escape before using in HTML
  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  function initials(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) { return "?"; }
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
  }

  function badgeColor(department) {
    const known = Store.DEPARTMENTS.indexOf(department);
    if (known !== -1) { return BADGE_COLORS[known]; }
    let hash = 0;
    for (const ch of String(department)) { hash = (hash * 31 + ch.charCodeAt(0)) >>> 0; }
    return BADGE_COLORS[hash % BADGE_COLORS.length];
  }

  function formatDate(ymd) {
    const parts = String(ymd).split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) { return String(ymd); }
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });
  }

  function percent(value) {
    return value === null || value === undefined ? "—" : value.toFixed(1) + "%";
  }

  /* ---------- Bootstrap alerts ---------- */
  function alert(type, message, timeout) {
    const host = document.getElementById("alertHost");
    if (!host) { return; }
    const icons = { success: "check-circle-fill", danger: "exclamation-triangle-fill", warning: "exclamation-circle-fill", info: "info-circle-fill" };
    const el = document.createElement("div");
    el.className = "alert alert-" + type + " alert-dismissible fade show d-flex align-items-center gap-2";
    el.setAttribute("role", "alert");
    el.innerHTML =
      '<i class="bi bi-' + (icons[type] || icons.info) + ' flex-shrink-0" aria-hidden="true"></i>' +
      '<div class="flex-grow-1"></div>' +
      '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
    el.children[1].textContent = message;
    host.appendChild(el);

    const ms = timeout === undefined ? 6000 : timeout;
    if (ms > 0) {
      window.setTimeout(function () {
        if (el.isConnected) { bootstrap.Alert.getOrCreateInstance(el).close(); }
      }, ms);
    }
  }

  /* ---------- Bootstrap pagination ---------- */
  function pageNumbers(page, total) {
    if (total <= 7) {
      return Array.from({ length: total }, function (_, i) { return i + 1; });
    }
    const set = new Set([1, total, page - 1, page, page + 1]);
    const nums = Array.from(set).filter(function (n) { return n >= 1 && n <= total; }).sort(function (a, b) { return a - b; });
    const out = [];
    nums.forEach(function (n, i) {
      if (i > 0 && n - nums[i - 1] > 1) { out.push("..."); }
      out.push(n);
    });
    return out;
  }

  function paginationHTML(page, total) {
    if (total <= 1) { return ""; }
    let html = '<li class="page-item' + (page === 1 ? " disabled" : "") + '">' +
      '<button type="button" class="page-link" data-page="' + (page - 1) + '" aria-label="Previous page"' + (page === 1 ? " disabled" : "") + '>&laquo;</button></li>';
    pageNumbers(page, total).forEach(function (n) {
      if (n === "...") {
        html += '<li class="page-item disabled"><span class="page-link">&hellip;</span></li>';
      } else {
        html += '<li class="page-item' + (n === page ? " active" : "") + '"' + (n === page ? ' aria-current="page"' : "") + '>' +
          '<button type="button" class="page-link" data-page="' + n + '" aria-label="Page ' + n + '">' + n + '</button></li>';
      }
    });
    html += '<li class="page-item' + (page === total ? " disabled" : "") + '">' +
      '<button type="button" class="page-link" data-page="' + (page + 1) + '" aria-label="Next page"' + (page === total ? " disabled" : "") + '>&raquo;</button></li>';
    return html;
  }

  /* ---------- notices shared by every page ---------- */
  // Shows #noDataAlert when there are no students, with a button to load sample data
  function bindNoDataNotice() {
    const box = document.getElementById("noDataAlert");
    const btn = document.getElementById("btnSample");
    if (btn) {
      btn.addEventListener("click", function () {
        if (Store.loadSample()) { alert("success", "Sample data loaded: 16 students and 5 days of attendance."); }
      });
    }
    function refresh() {
      const empty = Store.getStudents().length === 0;
      if (box) { box.classList.toggle("d-none", !empty); }
      const warn = document.getElementById("storageWarning");
      if (warn) { warn.classList.toggle("d-none", !Store.state.corrupt); }
    }
    document.addEventListener("students:changed", refresh);
    refresh();
  }

  // Reads the current filter controls (used by pages that share the filter bar)
  function fillOptions(select, values, allLabel) {
    const keep = select.value;
    select.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = allLabel;
    select.appendChild(first);
    values.forEach(function (v) {
      const o = document.createElement("option");
      o.value = String(v);
      o.textContent = String(v);
      select.appendChild(o);
    });
    select.value = values.map(String).indexOf(keep) !== -1 ? keep : "";
  }

  function departmentsInUse() {
    const set = new Set(Store.DEPARTMENTS);
    Store.getStudents().forEach(function (s) { if (s.department) { set.add(s.department); } });
    return Array.from(set);
  }

  function semestersInUse() {
    const set = new Set(Store.SEMESTERS.map(String));
    Store.getStudents().forEach(function (s) { if (s.semester) { set.add(s.semester); } });
    return Array.from(set).sort(function (a, b) { return Number(a) - Number(b) || a.localeCompare(b); });
  }

  document.addEventListener("DOMContentLoaded", bindNoDataNotice);

  return {
    esc: esc, initials: initials, badgeColor: badgeColor, formatDate: formatDate, percent: percent,
    alert: alert, paginationHTML: paginationHTML, fillOptions: fillOptions,
    departmentsInUse: departmentsInUse, semestersInUse: semestersInUse
  };
})();
