import * as aq from 'arquero';

export function rectangles_convert(dataset) {
  const rectangles = aq.from(dataset)
    .select("name", aq.endswith("___start"), aq.endswith("___end"))
    .fold(aq.endswith('___start'), {as: ['start_key', 'start']})
    .fold(aq.endswith('___end'), {as: ['end_key', 'end']})
    .derive({
      start_key: d => aq.op.replace(d.start_key, "___start", ""), 
      end_key: d => aq.op.replace(d.end_key, "___end", ""),     
    })
    .filter(d => d.start_key === d.end_key)
    .rename({"start_key": "type"})
    .select(aq.not("end_key"))
    .objects();
  return rectangles;
}

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

