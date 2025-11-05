import "./style.css";
import { createChart } from "./chart.js";

document.querySelector("#app").innerHTML = `
  <div>
    <div class="card">
      <div id="chart-container"></div>
    </div>
  </div>
`;

const container = document.querySelector("#chart-container");
createChart(container);
