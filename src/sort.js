import * as aq from "arquero";
export function Sort_Data(data) {
  const rects = aq.from(data.rectangles).select("name", "start", "end", "type");
  const events = aq
    .from(data.events)
    .select("name", "event", "type")
    .rename({ event: "end" });

  const combined = rects
    .concat(events)
    .groupby("name")
    .rollup({
      max_end: aq.op.max("end"),
    })
    .orderby("max_end")
    .objects();

  return combined;
}
