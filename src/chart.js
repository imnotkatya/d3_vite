import * as d3 from "d3";
import convertWideToLong from "./convertWideToLong";
import parseDate from "./parseDate";
import sort from "./sort";
import * as aq from "arquero";
import makeTable from "./makeTable";
import * as XLSX from "xlsx";

function handleExcelUpload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: "array" });
      const toTable = (sheet) =>
        aq.from(
          XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: "" })
        );

      resolve({
        stylesTable: toTable("styles_labels_line"),
        measureTable: toTable("measure"),
        datasetLongLoad: toTable("death_fu"),
      });
    };

    reader.onerror = () => reject(new Error("error"));
    reader.readAsArrayBuffer(file);
  });
}

function createScale(colors, property) {
  return d3
    .scaleOrdinal()
    .domain(colors.map((c) => c.key))
    .range(colors.map((c) => c[property]));
}

function getDomainX(parsedDatasetLong) {
  const times = parsedDatasetLong.rectangles
    .fold(["start", "end"], { as: ["type", "time"] })
    .concat(parsedDatasetLong.events.rename({ event: "time" }))
    .filter((d) => d.time >= 0)
    .array("time");
  return d3.extent(times);
}

function drawLines(svg, lineRectangles, scales, x, y) {
  const { strokeColor, strokeWidth, strokeDash } = scales;

  return svg
    .selectAll(".line")
    .data(lineRectangles)
    .enter()
    .append("line")
    .attr("class", "line")
    .attr("x1", (d) => x(d.start))
    .attr("x2", (d) => x(d.end))
    .attr("y1", (d) => y(d._rowNumber) + y.bandwidth() / 2)
    .attr("y2", (d) => y(d._rowNumber) + y.bandwidth() / 2)
    .attr("stroke", (d) => strokeColor(d.nameOfFigure))
    .attr("stroke-width", (d) => strokeWidth(d.nameOfFigure))
    .attr("stroke-dasharray", (d) => strokeDash(d.nameOfFigure))
    .attr("opacity", (d) => (d.start >= 0 ? 1 : 0));
}

function drawRects(svg, otherRectangles, scales, x, y) {
  const { strokeDash, color, strokeColor, strokeWidth, yModified } = scales;

  return svg
    .selectAll(".rects")
    .data(otherRectangles)
    .enter()
    .append("rect")
    .attr("stroke-dasharray", (d) => strokeDash(d.nameOfFigure))
    .attr("fill", (d) => color(d.nameOfFigure))
    .attr("stroke", (d) => strokeColor(d.nameOfFigure))
    .attr("opacity", (d) => (d.start >= 0 ? 1 : 0))
    .attr("stroke-width", (d) => strokeWidth(d.nameOfFigure))
    .attr("y", (d) => y(d._rowNumber) + yModified(d.nameOfFigure))
    .attr("x", (d) => x(d.start))
    .attr("height", y.bandwidth())
    .attr("width", (d) => Math.max(0, x(d.end) - x(d.start)));
}

function drawEvents(svg, events, scales, x, y) {
  const { color, yModified, xModified, symbols, symbolSize } = scales;

  return svg
    .selectAll(".event")
    .data(events)
    .enter()
    .append("text")
    .attr("x", (d) => x(d.event) + xModified(d.nameOfFigure))
    .attr(
      "y",
      (d) => y(d._rowNumber) + y.bandwidth() / 2 + yModified(d.nameOfFigure)
    )
    .attr("opacity", (d) => (d.event >= 0 ? 1 : 0))
    .attr("fill", (d) => color(d.nameOfFigure))
    .style("font-size", (d) => symbolSize(d.nameOfFigure))
    .style("font-family", "SymbolsNerdFontMono-Regular, monospace")
    .style("text-anchor", "middle")
    .text((d) => symbols(d.nameOfFigure));
}

function drawTable(svg, tableData, patients, fields, settingsContext, y) {
  const { marginLeft } = settingsContext;

  const columnWidths = fields.map((field) => {
    const maxLength = tableData
      .derive({
        field_length: aq.escape((d) => String(d[field]).length),
      })
      .rollup({ max_length: aq.op.max("field_length") })
      .object().max_length;
    return maxLength + 180;
  });

  fields.forEach((field, fieldIndex) => {
    if (fieldIndex === fields.length - 1) return;
    svg
      .selectAll(`table_rows`)
      .data(patients)
      .enter()
      .append("text")
      .attr(
        "x",
        marginLeft -
          550 +
          columnWidths
            .slice(0, fieldIndex)
            .reduce((sum, width) => sum + width, 0)
      )
      .attr("y", (d) => y(d._rowNumber) + y.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .text((d) => d[field]);
  });
}

function drawLegend(svg, scales, settingsContext, colors) {
  const {
    symbols,
    symbolSize,
    color,
    strokeColor,
    strokeWidth,
    strokeDash,
    typeFigure,
  } = scales;
  const { marginTop, marginRight, width } = settingsContext;

  const legendStartY = marginTop + 50;
  const legendItemHeight = 25;

  const legendGroup = svg
    .append("g")
    .attr("class", "legend")
    .attr(
      "transform",
      `translate(${width - marginRight + 50}, ${legendStartY})`
    );

  const uniqueLabels = aq.from(colors).dedupe("label").objects();
  uniqueLabels.forEach((colorObj, i) => {
    const key = colorObj.key;
    const symbol = symbols(key);

    if (symbol) {
      legendGroup
        .append("text")
        .attr("x", 0)
        .attr("y", i * legendItemHeight)
        .attr("text-anchor", "start")
        .attr("dy", "0.35em")
        .style("font-size", symbolSize(key))
        .text(symbol)
        .style("fill", color(key))
        .attr("stroke", strokeColor(key))
        .style("font-family", "SymbolsNerdFontMono-Regular, monospace")
        .attr("stroke-width", 0.5);
      return;
    }

    if (typeFigure(key) === "line") {
      legendGroup
        .append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", i * legendItemHeight)
        .attr("y2", i * legendItemHeight)
        .attr("stroke", strokeColor(key))
        .attr("stroke-width", strokeWidth(key))
        .attr("stroke-dasharray", strokeDash(key));
      return;
    }

    legendGroup
      .append("rect")
      .attr("x", 0)
      .attr("y", i * legendItemHeight - 10)
      .attr("width", 20)
      .attr("height", 15)
      .attr("stroke", strokeColor(key))
      .attr("stroke-dasharray", strokeDash(key))
      .attr("stroke-width", strokeWidth(key))
      .style("fill", color(key));
  });

  legendGroup
    .selectAll(".legend-label")
    .data(uniqueLabels)
    .enter()
    .append("text")
    .attr("x", 30)
    .attr("y", (d, i) => i * legendItemHeight)
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .text((d) => d.label);
}

function processData(raw) {
  const { stylesData, datasetLongLoad, settingsData } = raw;
  const settings = settingsData.reduce((acc, d) => {
    acc[d.measure] = +d.value;
    return acc;
  }, {});
  //meassures на settings
  const colors = stylesData.map((d) => ({
    key: d.key,
    type: d.type,
    color: d.color,
    label: d.label,
    strokeDash: +d.stroke_dash,
    yModify: +d.y_modify,
    xModify: +d.x_modify,
    stroke: d.stroke,
    symbol: d.symbol,
    symbolSize: +d.symbol_size,
    strokeWidth: +d["stroke-width"],
  }));

  const settingsContext = {
    width: settings.width || 1600,
    height: settings.height || 900,
    marginTop: settings.marginTop || 0,
    marginRight: settings.marginRight || 0,
    marginBottom: settings.marginBottom || 0,
    marginLeft: settings.marginLeft || 0,
  };

  const minD = stylesData[0].key;
  const datasetLong = parseDate(datasetLongLoad, minD);
  const parsedDatasetLong = convertWideToLong(datasetLong);
  const sortedData = sort(parsedDatasetLong);
  const tableData = makeTable(datasetLong, minD);
  const patients = tableData.objects();
  const fields = tableData.columnNames();
  const uniqueNames = sortedData.groupby("_rowNumber").array("_rowNumber");

  const scales = {
    color: createScale(colors, "color"),
    strokeColor: createScale(colors, "stroke"),
    strokeDash: createScale(colors, "strokeDash"),
    strokeWidth: createScale(colors, "strokeWidth"),
    yModified: createScale(colors, "yModify"),
    xModified: createScale(colors, "xModify"),
    symbolSize: createScale(colors, "symbolSize"),
    symbols: createScale(colors, "symbol"),
    typeFigure: createScale(colors, "type"),
  };

  return {
    colors,
    settingsContext,
    parsedDatasetLong,
    tableData,
    patients,
    fields,
    uniqueNames,
    scales,
  };
}

function drawChart(processedData, container) {
  const {
    colors,
    settingsContext,
    parsedDatasetLong,
    tableData,
    patients,
    fields,
    uniqueNames,
    scales,
  } = processedData;

  container.innerHTML = "";

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", settingsContext.width)
    .attr("height", settingsContext.height);

  const y = d3
    .scaleBand()
    .domain(uniqueNames)
    .paddingInner(0.5)
    .range([
      settingsContext.height - settingsContext.marginBottom,
      settingsContext.marginTop,
    ]);

  const x = d3
    .scaleLinear()
    .domain(getDomainX(parsedDatasetLong))
    .nice()
    .range([
      settingsContext.marginLeft,
      settingsContext.width - settingsContext.marginRight,
    ]);

  svg
    .append("g")
    .attr(
      "transform",
      `translate(0,${settingsContext.height - settingsContext.marginBottom})`
    )
    .call(d3.axisBottom(x));

  svg
    .append("g")
    .attr("transform", `translate(${settingsContext.marginLeft},0)`)
    .call(d3.axisLeft(y).tickFormat(""));

  const rectanglesArray = parsedDatasetLong.rectangles.objects();
  const events = parsedDatasetLong.events.objects();

  const lineRectangles = rectanglesArray.filter(
    (d) => scales.typeFigure(d.nameOfFigure) === "line"
  );

  const otherRectangles = rectanglesArray.filter(
    (d) => scales.typeFigure(d.nameOfFigure) !== "line"
  );

  drawLines(svg, lineRectangles, scales, x, y);
  drawRects(svg, otherRectangles, scales, x, y);
  drawEvents(svg, events, scales, x, y);
  drawTable(svg, tableData, patients, fields, settingsContext, y);
  drawLegend(svg, scales, settingsContext, colors);
}

export async function main(container) {
  const style = document.createElement("style");
  style.textContent = `
    @font-face {
      font-family: 'SymbolsNerdFontMono-Regular';
      src: url('/src/fonts/SymbolsNerdFontMono-Regular.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
  `;
  document.head.appendChild(style);
  container.innerHTML = `
    <div class="excelUpload">
      <input type="file" id="excelFile" accept=".xlsx, .xls" />
      <div id="chartContent"></div>
    </div>
  `;

  const fileInput = container.querySelector("#excelFile");
  const chartContent = container.querySelector("#chartContent");

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      chartContent.innerHTML = "";
      const excelData = await handleExcelUpload(file);
      const raw = {
        stylesData: excelData.stylesTable.objects(),
        settingsData: excelData.measureTable.objects(),
        datasetLongLoad: excelData.datasetLongLoad,
      };
      const processedData = processData(raw);
      drawChart(processedData, chartContent);
    } catch (error) {
      console.error("Error creating chart:", error);
      container.innerHTML = `<p>Error loading chart: ${error.message}</p>`;
    }
  });
}
