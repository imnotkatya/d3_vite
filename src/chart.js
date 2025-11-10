import * as d3 from "d3";
import convertWideToLong from "./convertWideToLong";
import sort from "./sort";
import * as aq from "arquero";

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
    const stylesTable = await aq.loadCSV("/src/data/styles_c.csv");
    const stylesData = stylesTable.objects();

    const colors = stylesData.map((d) => ({
      key: d.key,
      color: d.color,
      stroke_dash: +d.stroke_dash,
      y_modify: +d.y_modify,
      x_modify: +d.x_modify,
      stroke: d.stroke,
      symbol: d.symbol,
      symbol_size: +d.symbol_size,
      strokeWidth: +d["stroke-width"],
    }));

    const dataset_Long_load = await aq.loadCSV("/src/data/death.csv");
    // FIXME: ты конвертируешь в объекты, а потом снова делаешь arquero таблицу.
    // Просто передавай таблицу в функции и
    // возвращай тоже arquero таблицу.
    const dataset_Long = dataset_Long_load.objects();
    const parsedDataset_long = convertWideToLong(dataset_Long);
    const sortedData = sort(parsedDataset_long);

    container.innerHTML = "";

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // FIXME: use `distinct` and `array` methods
    const uniqueNames = [...new Set(sortedData.map((d) => d.name))];
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
        const patient = sortedData.find((p) => p.name === d);
        return patient.ro;
      })
      .style("font-size", "12px")
      .style("text-anchor", "end");

    const x = d3
      .scaleLinear()
      .domain([0, 2400])
      .range([marginLeft, width - marginRight]);

    const xAxis = d3
      .scaleLinear()
      .domain([0, 10])
      .range([marginLeft, width - marginRight]);

    // FIXME: Сделай хелпер для создания ординальной шкалы.
    // Вся разница в следующих 8 блоках кода — это функция передающаяся в range.
    const color = d3
      .scaleOrdinal()
      .domain(colors.map((c) => c.key))
      .range(colors.map((c) => c.color));

    const stroke_color = d3
      .scaleOrdinal()
      .domain(colors.map((c) => c.key))
      .range(colors.map((c) => c.stroke));

    const stroke_dash = d3
      .scaleOrdinal()
      .domain(colors.map((c) => c.key))
      .range(colors.map((c) => c.stroke_dash));

    const stroke_width = d3
      .scaleOrdinal()
      .domain(colors.map((c) => c.key))
      .range(colors.map((c) => c.strokeWidth));

    const y_modified = d3
      .scaleOrdinal()
      .domain(colors.map((c) => c.key))
      .range(colors.map((c) => c.y_modify));

    const x_modified = d3
      .scaleOrdinal()
      .domain(colors.map((c) => c.key))
      .range(colors.map((c) => c.x_modify));

    const symbols = d3
      .scaleOrdinal()
      .domain(colors.map((c) => c.key))
      .range(colors.map((c) => c.symbol));

    const symbol_size = d3
      .scaleOrdinal()
      .domain(colors.map((c) => c.key))
      .range(colors.map((c) => c.symbol_size));

    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(xAxis));

    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y));

    // FIXME: отрисовку линий, прямоугольников и легенды тоже лучше поместить в отдельные функции
    // так легче читать код
    // только по разным файлам их не раскидывай, оставь в этом.

    const lineRectangles = parsedDataset_long.rectangles.filter(
      (d) => d.type === "line"
    );

    svg
      .selectAll(".line")
      .data(lineRectangles)
      .enter()
      .append("line")
      .attr("class", "line")
      .attr("x1", (d) => x(d.start))
      .attr("x2", (d) => x(d.end))
      .attr("y1", (d) => y(d.name) + y.bandwidth() / 2)
      .attr("y2", (d) => y(d.name) + y.bandwidth() / 2)
      .attr("stroke", (d) => stroke_color(d.type))
      .attr("stroke-width", (d) => stroke_width(d.type))
      .attr("stroke-dasharray", (d) => stroke_dash(d.type))
      .attr("opacity", (d) => (d.start >= 0 ? 1 : 0));

    const otherRectangles = parsedDataset_long.rectangles.filter(
      (d) => d.type !== "line"
    );

    svg
      .selectAll(".rects")
      .data(otherRectangles)
      .enter()
      .append("rect")
      .attr("stroke-dasharray", (d) => stroke_dash(d.type))
      .attr("fill", (d) => color(d.type))
      .attr("stroke", (d) => stroke_color(d.type))
      .attr("opacity", (d) => (d.start >= 0 ? 1 : 0))
      .attr("stroke-width", (d) => stroke_width(d.type))
      .attr("y", (d) => y(d.name) + y_modified(d.type))
      .attr("x", (d) => x(d.start))
      .attr("height", y.bandwidth())
      .attr("width", (d) => Math.max(0, x(d.end) - x(d.start)));
    console.log(parsedDataset_long.events);
    svg
      .selectAll(".event")
      .data(parsedDataset_long.events)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.event) + x_modified(d.type))
      .attr("y", (d) => y(d.name) + y.bandwidth() / 2 + y_modified(d.type))
      .attr("opacity", (d) => (d.event >= 0 ? 1 : 0))
      .attr("fill", (d) => color(d.type))
      .style("font-size", (d) => symbol_size(d.type))
      .style("font-family", "SymbolsNerdFontMono-Regular, monospace")
      .style("text-anchor", "middle")
      .text((d) => symbols(d.type));

    const legendStartY = marginTop + 50;
    const legendItemHeight = 25;

    const legendGroup = svg
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${width - marginRight + 50}, ${legendStartY})`
      );

    colors.forEach((colorObj, i) => {
      const key = colorObj.key;
      const symbol = symbols(key);

      if (symbol) {
        legendGroup
          .append("text")
          .attr("x", 0)
          .attr("y", i * legendItemHeight)
          .attr("text-anchor", "start")
          .attr("dy", "0.35em")
          .style("font-size", symbol_size(key))
          .text(symbol)
          .style("fill", color(key))
          .attr("stroke", stroke_color(key))
          .style("font-family", "SymbolsNerdFontMono-Regular, monospace")
          .attr("stroke-width", 0.5);
      } else {
        if (key === "line") {
          legendGroup
            .append("line")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", i * legendItemHeight)
            .attr("y2", i * legendItemHeight)
            .attr("stroke", stroke_color(key))
            .attr("stroke-width", stroke_width(key))
            .attr("stroke-dasharray", stroke_dash(key));
        } else {
          legendGroup
            .append("rect")
            .attr("x", 0)
            .attr("y", i * legendItemHeight - 10)
            .attr("width", 20)
            .attr("height", 15)
            .attr("stroke", stroke_color(key))
            .attr("stroke-dasharray", stroke_dash(key))
            .attr("stroke-width", stroke_width(key))
            .style("fill", color(key));
        }
      }
    });

    legendGroup
      .selectAll(".legend-label")
      .data(colors.map((c) => c.key))
      .enter()
      .append("text")
      .attr("x", 30)
      .attr("y", (d, i) => i * legendItemHeight)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .text((d) => d);
  } catch (error) {
    console.error("Error creating chart:", error);
    container.innerHTML = `<p>Error loading chart: ${error.message}</p>`;
  }
}
