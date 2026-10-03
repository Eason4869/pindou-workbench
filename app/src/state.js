export function createState() {
  return {
    requestId: 0,
    busy: false,
    dirty: true,
    pattern: null,
    error: "",
    begin() {
      this.busy = true;
      this.error = "";
      return ++this.requestId;
    },
    accept(id, pattern) {
      if (id !== this.requestId) return false;
      this.pattern = pattern;
      this.busy = false;
      this.dirty = false;
      return true;
    },
    markDirty() {
      this.dirty = true;
      this.requestId++;
      this.busy = false;
    },
    fail(error) {
      this.error = error;
      this.busy = false;
    },
  };
}
