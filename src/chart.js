import * as d3 from "d3";
import convertWideToLong from "./convertWideToLong";
import parseDate from "./parseDate";
import sort from "./sort";
import * as aq from "arquero";
import TableData from "./TableData";

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
export async function createChart(container) {
  const style = document.createElement("style");
  style.textContent = `
    @font-face {
      font-family: 'SymbolsNerdFontMono-Regular';
      src: 
           url('/src/fonts/SymbolsNerdFontMono-Regular.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
  `;
  document.head.appendChild(style);

  const width = 1650;
  const height = 1000;
  const marginTop = 230;
  const marginRight = 250;
  const marginBottom = 100;
  const marginLeft = 650;

  try {
    const stylesTable = await aq.loadCSV("/src/data/styles_labels_line.csv");
    const stylesData = stylesTable.objects();

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

    const datasetLongLoad = await aq.loadCSV("/src/data/death_fu.csv");

    const minD = stylesData[0].key;
    const datasetLong = parseDate(datasetLongLoad, minD);
    const parsedDatasetLong = convertWideToLong(datasetLong);
    const sortedData = sort(parsedDatasetLong);

    const uniqueNames = sortedData.groupby("rowNumber").array("rowNumber");

    function drawLines(lineRectangles) {
      return svg
        .selectAll(".line")
        .data(lineRectangles)
        .enter()
        .append("line")
        .attr("class", "line")
        .attr("x1", (d) => x(d.start))
        .attr("x2", (d) => x(d.end))
        .attr("y1", (d) => y(d.rowNumber) + y.bandwidth() / 2)
        .attr("y2", (d) => y(d.rowNumber) + y.bandwidth() / 2)
        .attr("stroke", (d) => strokeColor(d.nameOfFigure))
        .attr("stroke-width", (d) => strokeWidth(d.nameOfFigure))
        .attr("stroke-dasharray", (d) => strokeDash(d.nameOfFigure))
        .attr("opacity", (d) => (d.start >= 0 ? 1 : 0));
    }

    function drawRects(otherRectangles) {
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
        .attr("y", (d) => y(d.rowNumber) + yModified(d.nameOfFigure))
        .attr("x", (d) => x(d.start))
        .attr("height", y.bandwidth())
        .attr("width", (d) => Math.max(0, x(d.end) - x(d.start)));
    }

    function drawEvents(parsedDatasetLong) {
      return svg
        .selectAll(".event")
        .data(parsedDatasetLong.events)
        .enter()
        .append("text")
        .attr("x", (d) => x(d.event) + xModified(d.nameOfFigure))
        .attr(
          "y",
          (d) => y(d.rowNumber) + y.bandwidth() / 2 + yModified(d.nameOfFigure)
        )
        .attr("opacity", (d) => (d.event >= 0 ? 1 : 0))
        .attr("fill", (d) => color(d.nameOfFigure))
        .style("font-size", (d) => symbolSize(d.nameOfFigure))
        .style("font-family", "SymbolsNerdFontMono-Regular, monospace")
        .style("text-anchor", "middle")
        .text((d) => symbols(d.nameOfFigure));
    }
    function drawTable() {
      const tableData = TableData(datasetLong, minD);
      const patients = tableData.objects();
      const fields = tableData.columnNames();

      fields.forEach((field, fieldIndex) => {
        svg
          .selectAll(`.patient-${field}`)
          .data(patients)
          .enter()
          .append("text")
          .attr("x", marginLeft - 550 + fieldIndex * 180)
          .attr("y", (d, i) => {
            return y(i + 1) + y.bandwidth() / 2;
          })
          .text((d) => d[field]);
      });
    }
    function drawLegend() {
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

    container.innerHTML = "";

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const y = d3
      .scaleBand()
      .domain(uniqueNames)
      .paddingInner(0.5)
      .range([height - marginBottom, marginTop]);

    const x = d3
      .scaleLinear()
      .domain(getDomainX(parsedDatasetLong))
      .nice()
      .range([marginLeft, width - marginRight]);

    const color = createScale(colors, "color");
    const strokeColor = createScale(colors, "stroke");
    const strokeDash = createScale(colors, "strokeDash");
    const strokeWidth = createScale(colors, "strokeWidth");
    const yModified = createScale(colors, "yModify");
    const xModified = createScale(colors, "xModify");
    const symbolSize = createScale(colors, "symbolSize");
    const symbols = createScale(colors, "symbol");
    const typeFigure = createScale(colors, "type");

    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x));

    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickFormat(""));

    const rectanglesArray = parsedDatasetLong.rectangles.objects();

    const lineRectangles = rectanglesArray.filter(
      (d) => typeFigure(d.nameOfFigure) === "line"
    );

    const otherRectangles = rectanglesArray.filter(
      (d) => typeFigure(d.nameOfFigure) !== "line"
    );

    drawLines(lineRectangles);
    drawRects(otherRectangles);
    drawEvents(parsedDatasetLong);
    drawLegend();

    drawTable();
  } catch (error) {
    console.error("Error creating chart:", error);
    container.innerHTML = `<p>Error loading chart: ${error.message}</p>`;
  }
}
