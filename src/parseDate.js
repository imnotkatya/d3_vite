import * as aq from "arquero";

export default function (dataset, minD) {
  const availableColumns = dataset.columnNames();
  const val =
    availableColumns.find((col) => col === minD + "___event") ||
    availableColumns.find((col) => col === minD + "___start");

  const result = aq
    .from(dataset)
    .derive({
      minDate: aq.escape((d) => d[val]),
    })
    .derive(
      Object.fromEntries(
        aq
          .from(dataset)
          .columnNames()
          .filter(
            (col) =>
              col.endsWith("___start") ||
              col.endsWith("___end") ||
              col.endsWith("___event")
          )
          .map((col) => [
            col,
            aq.escape(
              (d) =>
                (aq.op.parse_date(d[col]) - aq.op.parse_date(d.minDate)) /
                (1000 * 60 * 60 * 24) /
                365.25
            ),
          ])
      )
    );

  return result;
}
