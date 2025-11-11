import * as aq from "arquero";
export default function (data) {
  const rects = aq
    .from(data.rectangles)
    .select("name", "start", "end", "nameOfFigure");
  const events = aq
    .from(data.events)
    .select("name", "event", "nameOfFigure")
    .rename({ event: "end" });

  const combined = rects
    .concat(events)
    .groupby("name")
    .rollup({
      max_end: aq.op.max("end"),
    })
    .orderby("max_end");
  return combined;
}
