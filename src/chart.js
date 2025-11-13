import * as d3 from "d3";
import convertWideToLong from "./convertWideToLong";
import sort from "./sort";
import * as aq from "arquero";

function createScale(colors, property) {
  return d3
    .scaleOrdinal()
    .domain(colors.map((c) => c.key))
    .range(colors.map((c) => c[property]));
}
function getDomainX(parsedDatasetLong) {
  const times = [
    ...parsedDatasetLong.rectangles.objects().flatMap((d) => [d.start, d.end]),
    ...parsedDatasetLong.events.objects().map((d) => d.event),
  ].filter((t) => t >= 0);

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

  const width = 1200;
  const height = 1000;
  const marginTop = 230;
  const marginRight = 250;
  const marginBottom = 100;
  const marginLeft = 300;

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
    const datasetLong = aq.from(datasetLongLoad);
    const minD = stylesData[0].key;
    const parsedDatasetLong = convertWideToLong(datasetLong, minD);
    const sortedData = sort(parsedDatasetLong);
    const uniqueNames = sortedData.groupby("name").array("name");

    function drawLines(lineRectangles) {
      return svg
        .selectAll(".line")
        .data(lineRectangles)
        .enter()
        .append("line")
        .attr("class", "line")
        .attr("x1", (d) => x(d.start))
        .attr("x2", (d) => x(d.end))
        .attr("y1", (d) => y(d.name) + y.bandwidth() / 2)
        .attr("y2", (d) => y(d.name) + y.bandwidth() / 2)
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
        .attr("y", (d) => y(d.name) + yModified(d.nameOfFigure))
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
          (d) => y(d.name) + y.bandwidth() / 2 + yModified(d.nameOfFigure)
        )
        .attr("opacity", (d) => (d.event >= 0 ? 1 : 0))
        .attr("fill", (d) => color(d.nameOfFigure))
        .style("font-size", (d) => symbolSize(d.nameOfFigure))
        .style("font-family", "SymbolsNerdFontMono-Regular, monospace")
        .style("text-anchor", "middle")
        .text((d) => symbols(d.nameOfFigure));
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

    svg
      .selectAll(".patient-ro")
      .data(uniqueNames)
      .enter()
      .append("text")
      .attr("x", marginLeft - 70)
      .attr("y", (d) => y(d) + y.bandwidth() / 2)
      .attr("dy", "4px")
      .text((d) => {
        const patient = sortedData.objects().find((p) => p.name === d);
        return patient.ro;
      })
      .style("font-size", "12px")
      .style("text-anchor", "end");

    const xDomain = getDomainX(parsedDatasetLong);
    const x = d3
      .scaleLinear()
      .domain(xDomain)
      .nice()
      .range([marginLeft, width - marginRight]);
    const xAxis = d3
      .scaleLinear()
      .domain([0, 10])
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
      .call(d3.axisBottom(xAxis));

    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y));

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
  } catch (error) {
    console.error("Error creating chart:", error);
    container.innerHTML = `<p>Error loading chart: ${error.message}</p>`;
  }
}
