document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("csvFileInput");
  const fileName = document.getElementById("fileName");
  const tableContainer = document.getElementById("tableContainer");
  const saveImageButton = document.getElementById("saveImageButton");

  if (!input || !fileName || !tableContainer) {
    console.error("필수 HTML 요소를 찾지 못했습니다.");
    return;
  }

  if (saveImageButton) {
    saveImageButton.addEventListener("click", saveTableAsImage);
  }

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    fileName.textContent = file.name;

    const reader = new FileReader();

    reader.onload = function (event) {
      const text = event.target.result;
      const rows = parseCSV(text);

      if (!rows.length) {
        renderMessage(tableContainer, "CSV 데이터가 비어 있습니다.");
        return;
      }

      const headerIndex = rows.findIndex((row) =>
        row.some((cell) => String(cell).trim() === "품명")
      );

      if (headerIndex === -1) {
        renderMessage(tableContainer, "헤더 행을 찾지 못했습니다. CSV 형식을 확인해주세요.");
        return;
      }

      const headers = rows[headerIndex].map((cell) => String(cell).trim());
      const bodyRows = rows
        .slice(headerIndex + 1)
        .filter((row) => row.some((cell) => String(cell).trim() !== ""));

      const col = {
        name: headers.indexOf("품명"),
        type: headers.indexOf("타입"),
        boxType: headers.indexOf("박스종류"),
        flute: headers.indexOf("골"),
        length: headers.indexOf("장"),
        width: headers.indexOf("폭"),
        height: headers.indexOf("고"),
      };

      if (
        col.name === -1 ||
        col.length === -1 ||
        col.width === -1 ||
        col.height === -1
      ) {
        renderMessage(
          tableContainer,
          "필수 컬럼(품명, 장, 폭, 고)을 찾지 못했습니다."
        );
        return;
      }

      const products = bodyRows
        .map((row) => {
          const name = getCell(row, col.name);
          const length = getNumberCell(row, col.length);
          const width = getNumberCell(row, col.width);
          const height = getNumberCell(row, col.height);

          if (!name || length === null || width === null || height === null) {
            return null;
          }

          return {
            제품명: name,
            사이즈: `${length}X${width}X${height}`,
            골: col.flute !== -1 ? getCell(row, col.flute) : "",
            타입: col.type !== -1 ? getCell(row, col.type) : "",
            박스종류: col.boxType !== -1 ? getCell(row, col.boxType) : "",
            가로값: length,
          };
        })
        .filter(Boolean);

      renderGroupedTable(products, tableContainer);
    };

    reader.readAsText(file, "utf-8");
  });
});

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  return lines.map((line) => {
    const delimiter = line.includes(";") ? ";" : ",";
    return line.split(delimiter).map((value) => value.trim());
  });
}

function getCell(row, index) {
  if (index < 0 || index >= row.length) return "";
  return String(row[index]).trim();
}

function getNumberCell(row, index) {
  const value = getCell(row, index);
  if (!value) return null;

  const num = parseInt(value.replace(/[^\d.-]/g, ""), 10);
  return Number.isNaN(num) ? null : num;
}

function getSizeGroup(width) {
  if (width >= 200 && width <= 299) return "200";
  if (width >= 300 && width <= 399) return "300";
  if (width >= 400 && width <= 499) return "400";
  if (width >= 500) return "500";
  return null;
}

function renderGroupedTable(data, container) {
  container.innerHTML = "";

  const groups = {};

  data.forEach((item) => {
    const groupKey = getSizeGroup(item.가로값);
    if (!groupKey) return;

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push(item);
  });

  const order = ["200", "300", "400", "500"];
  let hasData = false;

  order.forEach((key) => {
    if (!groups[key] || groups[key].length === 0) return;

    hasData = true;

    groups[key].sort((a, b) => a.가로값 - b.가로값);

    const minWidth = groups[key][0].가로값;
    const maxWidth = groups[key][groups[key].length - 1].가로값;

    const section = document.createElement("div");
    section.className = "table-section";

    const title = document.createElement("h2");
    title.className = "table-section-title";
    title.textContent = `가로 사이즈 ${minWidth}~${maxWidth}mm`;

    const table = document.createElement("table");
    table.className = "product-table";

    table.innerHTML = `
      <colgroup>
        <col><col><col><col><col>
      </colgroup>
      <thead>
        <tr>
          <th>제품명</th>
          <th>사이즈</th>
          <th>골(두께)</th>
          <th>타입</th>
          <th>박스종류</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    groups[key].forEach((item) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(item.제품명)}</td>
        <td>${escapeHtml(item.사이즈)}</td>
        <td>${escapeHtml(item.골)}</td>
        <td>${escapeHtml(item.타입)}</td>
        <td>${escapeHtml(item.박스종류)}</td>
      `;

      tbody.appendChild(tr);
    });

    section.appendChild(title);
    section.appendChild(table);
    container.appendChild(section);
  });

  if (!hasData) {
    renderMessage(container, "표시할 데이터가 없습니다.");
  }
}

function renderMessage(container, message) {
  container.innerHTML = `
    <div class="empty-message">
      ${escapeHtml(message)}
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function saveTableAsImage() {
  const target = document.querySelector(".capture-wrap");

  if (!target) {
    alert("이미지로 저장할 영역을 찾지 못했습니다.");
    return;
  }

  if (typeof html2canvas === "undefined") {
    alert("html2canvas 라이브러리가 연결되지 않았습니다.");
    return;
  }

  try {
    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const link = document.createElement("a");
    link.download = "box-table.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error(error);
    alert("이미지 저장 중 오류가 발생했습니다.");
  }
}