import { createPdf } from "./pdf.js";
self.onmessage = async ({ data }) => {
  try {
    const bytes = await createPdf(data.pattern, data.info, data.fontBytes);
    self.postMessage({ bytes }, [bytes.buffer]);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
