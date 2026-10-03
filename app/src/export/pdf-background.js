export function createPdfInWorker(pattern, info, fontBytes) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./pdf.worker.js", import.meta.url), {
      type: "module",
    });
    const copy =
      fontBytes instanceof ArrayBuffer
        ? fontBytes.slice(0)
        : fontBytes.slice().buffer;
    worker.onmessage = ({ data }) => {
      worker.terminate();
      data.error ? reject(new Error(data.error)) : resolve(data.bytes);
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("PDF 后台生成失败"));
    };
    worker.postMessage({ pattern, info, fontBytes: copy }, [copy]);
  });
}
