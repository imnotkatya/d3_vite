import rectanglesConvert from "./rectanglesConvert";
import eventConvert from "./eventConvert";

export default function convertWideToLong(dataset) {
  const result = {
    events: [],
    rectangles: [],
  };
  result.rectangles = rectanglesConvert(dataset);
  result.events = eventConvert(dataset, result.rectangles);
  return result;
}
