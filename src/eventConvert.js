import * as aq from "arquero";

export default function (dataset, minD) {
  const val = minD + "___start";

  const events = aq
    .from(dataset)
    .select("name", aq.endswith("___event"), val)
    .derive({
      minDate: aq.escape((d) => d[val]),
    })
    .fold(aq.endswith("___event"), { as: ["event_key", "event"] })
    .filter((d) => d.event)
    .derive({
      nameOfFigure: (d) => aq.op.replace(d.event_key, "___event", ""),
      event: (d) => d.event - d.minDate,
    });

  return events;
}
