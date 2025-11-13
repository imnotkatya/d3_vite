import rectanglesConvert from "./rectanglesConvert";
import eventConvert from "./eventConvert";
export default function (dataset, minD) {
  const result = {
    events: [],
    rectangles: [],
  };

  result.rectangles = rectanglesConvert(dataset, minD);
  result.events = eventConvert(dataset, minD);
  return result;
}
