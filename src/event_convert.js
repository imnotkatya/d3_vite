import * as aq from "arquero";
export function events_convert(dataset) {
  const events = aq
    .from(dataset)
    .select("name", aq.endswith("___event"), "zero")
    .fold(aq.endswith("___event"), { as: ["event_key", "event"] })
    .filter((d) => d.event)
    .derive({
      type: (d) => aq.op.replace(d.event_key, "___event", ""),
      event: (d) =>
        (aq.op.parse_date(d.event) - aq.op.parse_date(d.zero)) /
        (1000 * 60 * 60 * 24),
    })

    .objects();
  return events;
}
