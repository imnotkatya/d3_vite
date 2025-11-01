export function events_convert(dataset) {
  const events = aq.from(dataset)
    .select("name", aq.endswith("___event"))
    .fold(aq.endswith('___event'), {as: ['event_key', 'event']})
    .derive({
      type: d => aq.op.replace(d.event_key, "___event", ""),
      event: d => +d.event 
    })
    .select(aq.not("event_key"))
    .objects();
  return events;
}

