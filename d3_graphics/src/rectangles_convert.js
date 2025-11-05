import * as aq from 'arquero';

export function  rectangles_convert(dataset)
{
   const rectangles = aq.from(dataset)
   .select("name",aq.endswith("___start"),aq.endswith("___end"),"zero")
  .fold(aq.endswith('___start'),{as:['start_key', 'start']})
  .fold(aq.endswith('___end'),{as:['end_key', 'end']})
   .derive({
    start_key: d => aq.op.replace(d.start_key, "___start", ""), 
    end_key: d => aq.op.replace(d.end_key, "___end", ""),     
   
  })
  .filter(d=>d.start_key===d.end_key)
  .rename({"start_key":"type","end_key":"type"})
  .filter(d => d.start )
   .derive({
     start: d => {
       const startDate = aq.op.parse_date(d.start);
       const zeroDate = aq.op.parse_date(d.zero);
       return (startDate - zeroDate) / (1000 * 60 * 60 * 24);
     },
     end: d => {
       const endDate = aq.op.parse_date(d.end);
       const zeroDate = aq.op.parse_date(d.zero);
       return (endDate - zeroDate) / (1000 * 60 * 60 * 24);
     }
   })
   .objects();
  ;
  return rectangles;
}