import * as d3 from 'd3';
import { convertWideToLong } from './convertWideToLong';
import * as aq from 'arquero';
import { Sort_Data } from './sort';
export async function createChart(container) {
  const width = 600;
  const height = 800;
  const marginTop = 30;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 120; 

  try {
const stylesTable = await aq.loadCSV('/src/data/styles.csv'); //RIGHT ROUTE!!!!
const stylesData = stylesTable.objects();

//const datasetTable = await aq.loadCSV('/src/data/zero_data.csv'); //RIGHT ROUTE!!!!

    const colors = stylesData.map(d => ({
      key: d.key,
      color: d.color,
      stroke_dash: +d.stroke_dash, 
      y_modify: +d.y_modify,  
      stroke: d.stroke,
      symbol: d.symbol,
      symbol_size: +d.symbol_size,
      strokeWidth: +d['stroke-width']
    }));

    const dataset_Long_load = await aq.loadCSV('/src/data/zero_data.csv');
    const dataset_Long=dataset_Long_load.objects();
   
  const parsedDataset_long = convertWideToLong(dataset_Long);
 console.log(parsedDataset_long)
  const sortedData = Sort_Data(parsedDataset_long);
   
    console.log("sorted:", sortedData);
  
    container.innerHTML = '';

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

     const uniqueNames = [...new Set(sortedData.map(d => d.name))];
    const y = d3.scaleBand()
      .domain(uniqueNames) 
      .paddingInner(0.2)
      .range([height - marginBottom, marginTop]);

    svg.selectAll(".patient-ro")
      .data(uniqueNames)
      .enter()
      .append("text")
      .attr("x", marginLeft - 70)
      .attr("y", d => y(d) + y.bandwidth() / 2)
      .attr("dy", "4px")
      .text(d => {
        const patient = sortedData.find(p => p.name === d);
        return patient.ro;
      })
      .style("font-size", "12px")
      .style("text-anchor", "end");

    const x = d3.scaleLinear()
      .domain([0, 50])
      .range([marginLeft, width - marginRight]);
    
    const color = d3.scaleOrdinal()
      .domain(colors.map(c => c.key))
      .range(colors.map(c => c.color));

    const stroke_color = d3.scaleOrdinal()
      .domain(colors.map(c => c.key))
      .range(colors.map(c => c.stroke));

    const stroke_dash = d3.scaleOrdinal()
      .domain(colors.map(c => c.key))
      .range(colors.map(c => c.stroke_dash));

    const stroke_width = d3.scaleOrdinal()
      .domain(colors.map(c => c.key))
      .range(colors.map(c => c.strokeWidth));
    
    const y_modified = d3.scaleOrdinal()
      .domain(colors.map(c => c.key))
      .range(colors.map(c => c.y_modify));
    
    const symbols = d3.scaleOrdinal()
      .domain(colors.map(c => c.key))
      .range(colors.map(c => c.symbol));
      
    const symbol_size = d3.scaleOrdinal()
      .domain(colors.map(c => c.key))
      .range(colors.map(c => c.symbol_size));
   
    svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickValues([0, 6, 12, 18, 24, 30, 36, 42, 48]));

    svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y));

   
    svg.selectAll(".rects")
      .data(parsedDataset_long.rectangles)
      .enter()
      .append("rect")
      .attr("stroke-dasharray", d => stroke_dash(d.type))
      .attr("fill", d => color(d.type))
      .attr("stroke", d => stroke_color(d.type))
      .attr("opacity", d => d.start >= 0 ? 1 : 0)
      .attr("stroke-width", d => stroke_width(d.type))
      .attr("y", d => y(d.name) + y_modified(d.type)) 
      .attr("x", d => x(d.start))
      .attr("height", y.bandwidth()) 
      .attr("width", d => Math.max(0, x(d.end) - x(d.start)));

   
    svg.selectAll(".event")
      .data(parsedDataset_long.events)
      .enter()
      .append("text")
      .attr("x", d => x(d.event))
      .attr("y", d => y(d.name) + y.bandwidth() / 2 + y_modified(d.type)) 
      .attr("opacity", d => d.event >= 0 ? 1 : 0)
      .style("font-size", d => symbol_size(d.type))
      .style("text-anchor", "middle")
      .text(d => symbols(d.type));

  
    colors.forEach((colorObj, i) => {
      const key = colorObj.key;
      const symbol = symbols(key); 
      if (symbol) {
        svg.append("text")
          .attr("x", width - 90)
          .attr("y", height/2 + 105 + i * 25)
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .style("font-size", "16px")
          .text(symbol)
          .style("fill", color(key))
          .attr("stroke", "black")
          .attr("stroke-width", 0.5);
      } else {
        svg.append("rect")
          .attr("x", width - 100)
          .attr("y", height/2 + 90 + i * 25)
          .attr("width", 20)
          .attr("height", 20)
          .attr("stroke", "black")
          .style("fill", color(key));
      }
    });
    
    svg.selectAll(".legend-label")
      .data(colors.map(c => c.key))
      .enter()
      .append("text")
      .attr("x", width - 170)
      .attr("y", (d, i) => height - 295 + i * 25) 
      .style("fill", 'black')
      .style("text-anchor", "end")
      .text(d => d);

  } catch (error) {
    console.error('Error creating chart:', error);
    container.innerHTML = `<p>Error loading chart: ${error.message}</p>`;
  }
}