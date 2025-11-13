import * as aq from "arquero";

export default function convertWideToLong(dataset) {
  const rectanglesWithZero = aq
    .from(dataset)
    .select("name", aq.endswith("___start"), aq.endswith("___end"))
    .fold(aq.endswith("___start"), { as: ["start_key", "start"] })
    .fold(aq.endswith("___end"), { as: ["end_key", "end"] })
    .derive({
      start_key: (d) => aq.op.replace(d.start_key, "___start", ""),
      end_key: (d) => aq.op.replace(d.end_key, "___end", ""),
    })
    .filter((d) => d.start_key === d.end_key)
    .rename({ start_key: "nameOfFigure", end_key: "nameOfFigure" })
    .filter((d) => d.start)
    .derive({
      start_date: (d) => aq.op.parse_date(d.start),
      end_date: (d) => aq.op.parse_date(d.end),
    })
    .groupby("name")
    .derive({
      zero: aq.op.min("start_date"),
    });

  const rectangles = rectanglesWithZero
    .derive({
      start: (d) => (d.start_date - d.zero) / (1000 * 60 * 60 * 24),
      end: (d) => (d.end_date - d.zero) / (1000 * 60 * 60 * 24),
    })
    .select("name", "nameOfFigure", "start", "end");

  const patientZeros = rectanglesWithZero
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

  return { rectangles, events };
}
