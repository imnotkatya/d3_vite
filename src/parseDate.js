import * as aq from "arquero";

export default function (dataset) {
  const result = aq.from(dataset).derive(
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
          aq.escape((d) => aq.op.parse_date(d[col]) / (1000 * 60 * 60 * 24)),
        ])
    )
  );

  return result;
}
