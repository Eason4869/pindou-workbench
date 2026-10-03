export function createBrowserAdapter({ restricted = false } = {}) {
  return {
    kind: restricted ? "preview" : "browser",
    async saveFromClick(bytes, name, mime) {
      if (restricted) return { status: "preview-restricted" };
      const url = URL.createObjectURL(new Blob([bytes], { type: mime })),
        a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { status: "download-started" };
    },
  };
}
