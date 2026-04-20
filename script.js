document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("csvFileInput");
  const fileName = document.getElementById("fileName");
  const tableContainer = document.querySelector(".table-scroll");

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    fileName.textContent = file.name;

    const reader = new FileReader();

    reader.onload = function (event) {
      const text = event.target.result;

      const rows = text
        .split(/\r?\n/)
        .map(row => row.trim())
        .filter(Boolean);

      const data = rows.map(row => {
        if (row.includes(";")) return row.split(";");
        return row.split(",");
      });

      const filtered = data.filter((row, index) => {
        if (index === 0) return false;
        return row[0] && row[0].trim() !== "";
      });

      renderGroupedTable(filtered, tableContainer);
    };

    reader.readAsText(file, "euc-kr");
  });
});

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

  data.forEach(row => {
    const size = row[1];
    if (!size) return;

    const width = parseInt(size.split("X")[0], 10);
    if (isNaN(width)) return;

    const groupKey = getSizeGroup(width);
    if (!groupKey) return;

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push(row);
  });

  const order = ["200", "300", "400", "500"];

  order.forEach(key => {
    if (!groups[key]) return;

    groups[key].sort((a, b) => {
      const aSize = parseInt(a[1].split("X")[0], 10);
      const bSize = parseInt(b[1].split("X")[0], 10);
      return aSize - bSize;
    });

    const widths = groups[key].map(row => parseInt(row[1].split("X")[0], 10));
    const minWidth = Math.min(...widths);
    const maxWidth = Math.max(...widths);

    const section = document.createElement("div");
    section.style.marginBottom = "40px";

    const title = document.createElement("h2");
    title.textContent = `${minWidth}~${maxWidth}mm`;
    title.style.color = "#214fa5";
    title.style.margin = "20px 0 10px";
    title.style.fontSize = "28px";
    title.style.fontWeight = "800";

    section.appendChild(title);

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

    groups[key].forEach(row => {
      const tr = document.createElement("tr");

      row.slice(0, 6).forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell.trim();
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    section.appendChild(table);
    container.appendChild(section);
  });

  if (Object.keys(groups).length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px; color:#777;">
        표시할 데이터가 없습니다.
      </div>
    `;
  }
}