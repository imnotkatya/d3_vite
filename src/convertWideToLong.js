import { rectangles_convert } from './rectangles_convert.js';
import { events_convert } from './event_convert.js';
export function convertWideToLong(dataset) {
  const result = {
    events: [],
    rectangles: []
  };
  result.rectangles = rectangles_convert(dataset);
  result.events = events_convert(dataset);
  return result;
}