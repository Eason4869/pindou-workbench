import { convertRgba } from "./convert.js";
self.onmessage = ({ data }) => {
  const { requestId, image, settings, palette } = data;
  try {
    self.postMessage({
      requestId,
      pattern: convertRgba(image, settings, palette),
    });
  } catch (error) {
    self.postMessage({ requestId, error: error.message });
  }
};
