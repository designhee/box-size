function findColumn(headers, keywords) {
  return headers.findIndex((header) =>
    keywords.some((keyword) => header.includes(keyword))
  );
}

function normalizeHeaders(headers) {
  return headers.map((header) => String(header).replace(/\s/g, "").trim());
}

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
        row.some((cell) =>
          ["품명", "상품명", "제품명"].includes(String(cell).trim())
        )
      );

      if (headerIndex === -1) {
        renderMessage(
          tableContainer,
          "헤더 행을 찾지 못했습니다. CSV 형식을 확인해주세요."
        );
        return;
      }

      const headers = normalizeHeaders(rows[headerIndex]);
      const bodyRows = rows
        .slice(headerIndex + 1)
        .filter((row) => row.some((cell) => String(cell).trim() !== ""));

      const col = {
        name: findColumn(headers, ["품명", "상품명", "제품명"]),
        size: findColumn(headers, ["사이즈", "규격", "제품사이즈"]),
        sales: findColumn(headers, ["판매수", "판매량", "수량"]),
        flute: findColumn(headers, ["골", "골(두께)", "두께"]),
        process: findColumn(headers, ["제조방식", "가공방식", "생산방식"]),
        courier: findColumn(headers, ["택배사", "배송사", "운송사"]),
        length: findColumn(headers, ["장", "길이"]),
        width: findColumn(headers, ["폭", "가로"]),
        height: findColumn(headers, ["고", "높이", "세로"]),
      };

      if (col.name === -1) {
        renderMessage(
          tableContainer,
          "제품명 컬럼(품명/상품명/제품명)을 찾지 못했습니다."
        );
        return;
      }

      const hasSizeColumn = col.size !== -1;
      const hasDimensionColumns =
        col.length !== -1 && col.width !== -1 && col.height !== -1;

      if (!hasSizeColumn && !hasDimensionColumns) {
        renderMessage(
          tableContainer,
          "사이즈 컬럼 또는 장/폭/고 컬럼을 찾지 못했습니다."
        );
        return;
      }

      const products = bodyRows
        .map((row) => {
          const name = getCell(row, col.name);
          if (!name) return null;

          let sizeText = "";
          let widthBase = null;

          if (col.size !== -1) {
            const rawSize = getCell(row, col.size);
            const normalizedSize = normalizeSizeText(rawSize);

            if (normalizedSize) {
              sizeText = normalizedSize;
              widthBase = extractFirstNumber(normalizedSize);
            }
          }

          if (!sizeText && hasDimensionColumns) {
            const length = getNumberCell(row, col.length);
            const width = getNumberCell(row, col.width);
            const height = getNumberCell(row, col.height);

            if (length !== null && width !== null && height !== null) {
              sizeText = `${length}X${width}X${height}`;
              widthBase = length;
            }
          }

          if (!sizeText || widthBase === null) {
            return null;
          }

          return {
            제품명: name,
            사이즈: sizeText,
            판매수: col.sales !== -1 ? getCell(row, col.sales) : "",
            골: col.flute !== -1 ? getCell(row, col.flute) : "",
            제조방식: col.process !== -1 ? getCell(row, col.process) : "",
            택배사: col.courier !== -1 ? getCell(row, col.courier) : "",
            가로값: widthBase,
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

function normalizeSizeText(value) {
  if (!value) return "";

  return String(value)
    .trim()
    .replace(/[×x]/gi, "X")
    .replace(/\s+/g, "");
}

function extractFirstNumber(value) {
  const match = String(value).match(/\d+/);
  if (!match) return null;

  const num = parseInt(match[0], 10);
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
        <col><col><col><col><col><col>
      </colgroup>
      <thead>
        <tr>
          <th>제품명</th>
          <th>사이즈</th>
          <th>판매수</th>
          <th>골(두께)</th>
          <th>제조방식</th>
          <th>택배사</th>
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
        <td>${escapeHtml(item.판매수)}</td>
        <td>${escapeHtml(item.골)}</td>
        <td>${escapeHtml(item.제조방식)}</td>
        <td>${escapeHtml(item.택배사)}</td>
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