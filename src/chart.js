import * as d3 from "d3";
import convertWideToLong from "./convertWideToLong";
import parseDate from "./parseDate";
import sort from "./sort";
import * as aq from "arquero";
import makeTable from "./makeTable";
import * as XLSX from "xlsx";

function loadExcel(workbook, sheetName) {
  const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: "",
  });
  return aq.from(sheetData);
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

function drawLines(svg, lineRectangles, scales) {
  const { strokeColor, strokeWidth, strokeDash, x, y } = scales;

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

function drawRects(svg, otherRectangles, scales) {
  const { strokeDash, x, y, color, strokeColor, strokeWidth, yModified } =
    scales;

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

function drawEvents(svg, events, scales) {
  const { color, yModified, xModified, symbols, symbolSize, x, y } = scales;

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

function drawTable(svg, tableData, patients, fields, scales, measures_context) {
  const { y } = scales;
  const { marginLeft } = measures_context;

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

function drawLegend(svg, scales, measures_context) {
  const {
    symbols,
    symbolSize,
    color,
    strokeColor,
    strokeWidth,
    strokeDash,
    typeFigure,
    colors,
  } = scales;
  const { marginTop, marginRight, width } = measures_context;

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

function drawChart(raw, container) {
  const colors = raw.stylesData.map((d) => ({
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

  const measures_context = {
    width: raw.measures.width || 1600,
    height: raw.measures.height || 900,
    marginTop: raw.measures.marginTop || 0,
    marginRight: raw.measures.marginRight || 0,
    marginBottom: raw.measures.marginBottom || 0,
    marginLeft: raw.measures.marginLeft || 0,
  };

  const minD = raw.stylesData[0].key;

  const datasetLong = parseDate(raw.datasetLongLoad, minD);
  const parsedDatasetLong = convertWideToLong(datasetLong);
  const sortedData = sort(parsedDatasetLong);
  const tableData = makeTable(datasetLong, minD);
  const patients = tableData.objects();
  const fields = tableData.columnNames();
  const uniqueNames = sortedData.groupby("_rowNumber").array("_rowNumber");

  container.innerHTML = "";

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", measures_context.width)
    .attr("height", measures_context.height);

  const y = d3
    .scaleBand()
    .domain(uniqueNames)
    .paddingInner(0.5)
    .range([
      measures_context.height - measures_context.marginBottom,
      measures_context.marginTop,
    ]);

  const x = d3
    .scaleLinear()
    .domain(getDomainX(parsedDatasetLong))
    .nice()
    .range([
      measures_context.marginLeft,
      measures_context.width - measures_context.marginRight,
    ]);

  svg
    .append("g")
    .attr(
      "transform",
      `translate(0,${measures_context.height - measures_context.marginBottom})`
    )
    .call(d3.axisBottom(x));

  svg
    .append("g")
    .attr("transform", `translate(${measures_context.marginLeft},0)`)
    .call(d3.axisLeft(y).tickFormat(""));

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
    x: x,
    y: y,
    colors: colors,
  };

  const rectanglesArray = parsedDatasetLong.rectangles.objects();
  const events = parsedDatasetLong.events.objects();

  const lineRectangles = rectanglesArray.filter(
    (d) => scales.typeFigure(d.nameOfFigure) === "line"
  );

  const otherRectangles = rectanglesArray.filter(
    (d) => scales.typeFigure(d.nameOfFigure) !== "line"
  );

  drawLines(svg, lineRectangles, scales);
  drawRects(svg, otherRectangles, scales);
  drawEvents(svg, events, scales);
  drawTable(svg, tableData, patients, fields, scales, measures_context);
  drawLegend(svg, scales, measures_context);
}

const loadData = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const stylesTable = loadExcel(workbook, "styles_labels_line");
  const measureTable = loadExcel(workbook, "measure");
  const datasetLongLoad = loadExcel(workbook, "death_fu");
  const stylesData = stylesTable.objects();
  const measureData = measureTable.objects();
  const measures = {};
  measureData.forEach((d) => {
    measures[d.measure] = +d.value;
  });

  return { stylesData, measures, datasetLongLoad };
};

export async function createChart(container) {
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

  try {
    const file = await fetch("/src/data/infoo.xlsx");
    const raw = await loadData(file);
    drawChart(raw, container);
  } catch (error) {
    console.error("Error creating chart:", error);
    container.innerHTML = `<p>Error loading chart: ${error.message}</p>`;
  }
}
