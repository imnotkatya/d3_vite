import * as aq from "arquero";

export default function (dataset, minD) {
  const availableColumns = dataset.columnNames();
  const val =
    availableColumns.find((col) => col === minD + "___event") ||
    availableColumns.find((col) => col === minD + "___start");

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
