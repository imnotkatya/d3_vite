import * as aq from "arquero";

export default function (dataset, minD) {
  //check for event also
  const val = minD + "___start";
  const rectangles = aq
    .from(dataset)
    .select("name", aq.endswith("___start"), aq.endswith("___end"))
    .derive({
      minDate: aq.escape((d) => d[val]), //into another func
    })
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
      start: (d) => d.start - d.minDate,
      end: (d) => d.end - d.minDate,
    });

  return rectangles;
}
