export function createImportIntent() {
  let token = 0;
  return { begin: () => ++token, isCurrent: (id) => id === token };
}
export function createSaveSession() {
  return {
    pending: null,
    busy: false,
    prepare(file) {
      if (this.busy) return false;
      this.pending = { ...file, directory: false };
      return true;
    },
    cancel() {
      if (this.busy) return false;
      this.pending = null;
      return true;
    },
    begin() {
      if (this.busy || !this.pending) return null;
      this.busy = true;
      return this.pending;
    },
    finish(file, result) {
      if (file !== this.pending) return false;
      this.busy = false;
      if (result.status === "saved") this.pending = null;
      else if (result.status === "needs-directory") file.directory = true;
      return true;
    },
    fail(file) {
      if (file !== this.pending) return false;
      this.busy = false;
      return true;
    },
  };
}
