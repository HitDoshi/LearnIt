var ROW_COUNT = 10;
var COL_COUNT = 3;

var dbName = "user";
var storeName = "userData";
var userDB;

var subject = parseInt(JSON.parse(localStorage.getItem("source-language") || "{}").id || 1);
var targetSubjectId = parseInt(JSON.parse(localStorage.getItem("target-language") || "{}").id || 1);

var userOpenRequest = indexedDB.open(dbName, 1);

userOpenRequest.onupgradeneeded = function (e) {
  var db = e.target.result;
  if (!db.objectStoreNames.contains(storeName)) {
    var store = db.createObjectStore(storeName, { keyPath: "id" });
    store.createIndex("subjectIndex", ["sourceSubjectId", "targetSubjectId"]);
  }
};

userOpenRequest.onsuccess = function (e) { userDB = e.target.result; };
userOpenRequest.onerror = function (e) { console.error("DB error:", e.target.error); };

document.getElementById("backBtn").onclick = function () {
  window.history.back();
};

var selAnchor = null;
var selFocus = null;
var cutCells = null;

function getCell(r, c) {
  var rows = document.querySelectorAll("#gridRows .grid-row");
  if (!rows[r]) return null;
  return rows[r].querySelectorAll("input")[c] || null;
}

function getRowCol(inp) {
  var row = inp.closest(".grid-row");
  if (!row) return null;
  var inputs = Array.from(row.querySelectorAll("input"));
  var col = inputs.indexOf(inp);
  var rowIdx = parseInt(row.dataset.index);
  return { row: rowIdx, col: col };
}

function buildGrid() {
  var container = document.getElementById("gridRows");
  container.innerHTML = "";

  for (var i = 0; i < ROW_COUNT; i++) {
    var row = document.createElement("div");
    row.className = "grid-row";
    row.dataset.index = i;

    var num = document.createElement("div");
    num.className = "row-num";
    num.textContent = i + 1;
    num.dataset.row = i;

    num.addEventListener("click", function () {
      var r = parseInt(this.dataset.row);
      selAnchor = { row: r, col: 0 };
      selFocus = { row: r, col: COL_COUNT - 1 };
      redraw();
    });

    row.appendChild(num);

    var classes = ["cell-source", "cell-target", "cell-note"];
    for (var c = 0; c < COL_COUNT; c++) {
      row.appendChild(makeCell(classes[c], i, c));
    }

    container.appendChild(row);
  }

  updateCount();
  redraw();
}

function makeCell(cls, rowIdx, colIdx) {
  var inp = document.createElement("input");
  inp.type = "text";
  inp.className = cls;
  inp.autocomplete = "off";
  inp.spellcheck = false;

  inp.addEventListener("focus", function () {
    selAnchor = { row: rowIdx, col: colIdx };
    selFocus = { row: rowIdx, col: colIdx };
    redraw();
  });

  inp.addEventListener("input", function () {
    updateCount();
  });

  inp.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      e.preventDefault();
      var nc = e.shiftKey ? colIdx - 1 : colIdx + 1;
      var nr = rowIdx;
      if (nc < 0) { nc = COL_COUNT - 1; nr = Math.max(0, rowIdx - 1); }
      if (nc >= COL_COUNT) { nc = 0; nr = Math.min(ROW_COUNT - 1, rowIdx + 1); }
      focusCell(nr, nc);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      focusCell(Math.min(ROW_COUNT - 1, rowIdx + 1), colIdx);
      return;
    }

    if (e.key === "ArrowDown" && e.target.selectionStart === e.target.value.length) {
      e.preventDefault(); focusCell(Math.min(ROW_COUNT - 1, rowIdx + 1), colIdx); return;
    }
    if (e.key === "ArrowUp" && e.target.selectionStart === 0) {
      e.preventDefault(); focusCell(Math.max(0, rowIdx - 1), colIdx); return;
    }
  });

  inp.addEventListener("paste", function (e) {
    var cd = e.clipboardData || window.clipboardData;
    if (!cd) return;

    var html = cd.getData("text/html");
    var plain = cd.getData("text/plain");

    var data = null;
    if (html && html.indexOf("<td") !== -1) {
      data = parseHtml(html);
    }
    if (!data || data.length === 0) {
      data = parsePlain(plain);
    }

    if (!data || data.length === 0) return;

    if (data.length === 1 && data[0].length === 1) return;

    e.preventDefault();

    selAnchor = { row: rowIdx, col: colIdx };
    writeData(data, rowIdx, colIdx);
  });

  return inp;
}

function focusCell(r, c) {
  var inp = getCell(r, c);
  if (inp) {
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }
}

function parseHtml(html) {
  var div = document.createElement("div");
  div.innerHTML = html;
  var result = [];
  div.querySelectorAll("tr").forEach(function (tr) {
    var cols = [];
    tr.querySelectorAll("td, th").forEach(function (td) {
      cols.push((td.innerText || td.textContent || "").trim());
    });
    if (cols.length > 0 && cols.some(function (c) { return c; })) {
      result.push(cols);
    }
  });
  return result.length > 0 ? result : null;
}

function parsePlain(text) {
  if (!text || !text.trim()) return null;
  var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
  return lines.map(function (line) {
    if (line.indexOf("\t") !== -1) {
      return line.split("\t").map(function (c) { return c.trim(); });
    }
    return line.split(",").map(function (c) { return c.replace(/^"|"$/g, "").trim(); });
  });
}

function writeData(data, startRow, startCol) {
  if (cutCells) {
    cutCells.forEach(function (key) {
      var p = key.split(",");
      var inp = getCell(parseInt(p[0]), parseInt(p[1]));
      if (inp) inp.value = "";
    });
    cutCells = null;
  }

  var lastR = startRow;
  var lastC = startCol;

  for (var r = 0; r < data.length && (startRow + r) < ROW_COUNT; r++) {
    for (var c = 0; c < data[r].length && (startCol + c) < COL_COUNT; c++) {
      var inp = getCell(startRow + r, startCol + c);
      if (inp) inp.value = data[r][c] || "";
      lastR = startRow + r;
      lastC = startCol + c;
    }
  }

  selFocus = { row: lastR, col: lastC };
  updateCount();
  redraw();
  showToast("Pasted " + Math.min(data.length, ROW_COUNT - startRow) + " row(s)");
}

function getRange() {
  if (!selAnchor || !selFocus) return null;
  return {
    r0: Math.min(selAnchor.row, selFocus.row),
    c0: Math.min(selAnchor.col, selFocus.col),
    r1: Math.max(selAnchor.row, selFocus.row),
    c1: Math.max(selAnchor.col, selFocus.col)
  };
}

function redraw() {
  var range = getRange();
  document.querySelectorAll("#gridRows .grid-row").forEach(function (rowEl, ri) {
    var rowSel = false;
    rowEl.querySelectorAll("input").forEach(function (inp, ci) {
      inp.classList.remove("cell-selected", "cell-in-range", "cell-cut");

      var isAnchor = selAnchor && ri === selAnchor.row && ci === selAnchor.col;
      var inRng = range && ri >= range.r0 && ri <= range.r1 && ci >= range.c0 && ci <= range.c1;
      var isCut = cutCells && cutCells.has(ri + "," + ci);

      if (isCut) { inp.classList.add("cell-cut"); }
      else if (isAnchor) { inp.classList.add("cell-selected"); rowSel = true; }
      else if (inRng) { inp.classList.add("cell-in-range"); rowSel = true; }
    });

    if (rowSel) rowEl.classList.add("row-selected");
    else rowEl.classList.remove("row-selected");
  });

  var info = document.getElementById("selectionInfo");

  if (range) {
    var cells = (range.r1 - range.r0 + 1) * (range.c1 - range.c0 + 1);
    if (cells > 1) {
      info.textContent = cells + " cells selected";
      info.style.display = "inline";
    } else {
      info.style.display = "none";
    }
  } else {
    info.style.display = "none";
  }
}

function selectAll() {
  selAnchor = { row: 0, col: 0 };
  selFocus = { row: ROW_COUNT - 1, col: COL_COUNT - 1 };
  redraw();
}


document.getElementById("headerNum").addEventListener("click", selectAll);

document.addEventListener("keydown", function (e) {
  var active = document.activeElement;
  var isInGrid = active && active.closest && active.closest("#gridRows");
  if (isInGrid) return;
  if (e.key === "Escape") { selAnchor = null; selFocus = null; redraw(); }
});

document.addEventListener("pointerdown", function (e) {
  var grid = document.getElementById("gridWrapper");
  var tb = document.getElementById("cellToolbar");
  if (!grid.contains(e.target) && !tb.contains(e.target)) {
    selAnchor = null;
    selFocus = null;
    redraw();
  }
});

function updateCount() {
  document.querySelectorAll("#gridRows .grid-row").forEach(function (row) {
    var s = row.querySelector(".cell-source").value.trim();
    var t = row.querySelector(".cell-target").value.trim();
    if (s && t) row.classList.add("has-data");
    else row.classList.remove("has-data");
  });
}

function collectRows() {
  var result = [];
  document.querySelectorAll("#gridRows .grid-row").forEach(function (row) {
    var s = row.querySelector(".cell-source").value.trim();
    var t = row.querySelector(".cell-target").value.trim();
    var n = row.querySelector(".cell-note").value.trim();
    if (s && t) result.push({ source: s, target: t, note: n });
  });
  return result;
}

function clearGrid() {
  document.querySelectorAll("#gridRows input").forEach(function (inp) { inp.value = ""; });
  selAnchor = null;
  selFocus = null;
  cutCells = null;
  internalClipboard = null;
  updateCount();
  redraw();
}

document.getElementById("clearBtn").onclick = clearGrid;

document.getElementById("saveBtn").onclick = function () {
  var token = localStorage.getItem("token");
  if (!token) { showToast("Access to this section requires a login.\nPlease login first !!"); return; }

  var user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.email) { showToast("User not found.\nPlease login again !!"); return; }

  var rows = collectRows();
  if (rows.length === 0) { showToast("Nothing to save. Fill at least one row."); return; }

  var btn = document.getElementById("saveBtn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  saveAllRows(rows, user).then(function () {
    clearGrid();
    btn.disabled = false;
    btn.textContent = "Save";
    showToast(rows.length + " item(s) saved successfully!");
  }).catch(function (err) {
    btn.disabled = false;
    btn.textContent = "Save";
    if (err !== "max_reached") showToast("Error saving data. Please try again.");
    console.error(err);
  });
};

function saveAllRows(rows, user) {
  return new Promise(function (resolve, reject) {
    if (!userDB) { reject("db_not_ready"); return; }

    var maxUD = parseInt(user.maxUD || 0);
    var tx = userDB.transaction(storeName, "readwrite");
    var store = tx.objectStore(storeName);

    var countReq = store.count();
    countReq.onsuccess = function () {
      if (maxUD > 0 && countReq.result >= maxUD) {
        showToast("Maximum number of values is reached for this account.");
        reject("max_reached");
        return;
      }

      var cursorReq = store.openCursor(null, "prev");
      var maxId = 0;

      cursorReq.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) maxId = cursor.value.id || 0;

        function addNext(i) {
          if (i >= rows.length) { resolve(); return; }
          maxId++;
          var item = {
            id: maxId,
            subjectId: subject,
            sourceSubjectId: subject,
            targetSubjectId: targetSubjectId,
            source: rows[i].source,
            target: rows[i].target,
            targetNote: rows[i].note,
            isFav: false,
            isSkip: false,
            showInDays: 0,
            lastShown: 0,
            topicId: 0
          };
          var req = store.add(item);
          req.onsuccess = function () { addNext(i + 1); };
          req.onerror = function (err) { console.error("Row error:", err); addNext(i + 1); };
        }

        addNext(0);
      };

      cursorReq.onerror = function (err) { reject(err); };
    };

    countReq.onerror = function (err) { reject(err); };
  });
}

buildGrid();
