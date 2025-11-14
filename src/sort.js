import * as aq from "arquero";
export default function (data) {
  const rects = aq
    .from(data.rectangles)
    .select("name", "start", "end", "nameOfFigure", "rowNumber");
  const events = aq
    .from(data.events)
    .select("name", "event", "nameOfFigure", "rowNumber")
    .rename({ event: "end" });

  const combined = rects
    .concat(events)
    .groupby("rowNumber")
    .rollup({
      max_end: aq.op.max("end"),
    })
    .orderby("max_end");
  return combined;
}
