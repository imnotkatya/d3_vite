import * as aq from "arquero";

export default function (dataset, rectangles) {
  const patientZeros = rectangles
    .select("name", "zero")
    .dedupe("name")
    .objects()
    .reduce((acc, curr) => {
      acc[curr.name] = curr.zero;
      return acc;
    }, {});

  const events = aq
    .from(dataset)
    .select("name", aq.endswith("___event"))
    .fold(aq.endswith("___event"), { as: ["event_key", "event"] })
    .filter((d) => d.event)
    .derive({
      nameOfFigure: (d) => aq.op.replace(d.event_key, "___event", ""),
      event: aq.escape((d) => {
        const zeroDate = patientZeros[d.name];
        return (aq.op.parse_date(d.event) - zeroDate) / (1000 * 60 * 60 * 24);
      }),
    });
  return events;
}
