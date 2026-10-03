const messages = {
  FILE_ALREADY_EXISTS: "已有同名文件，请修改作品名再保存",
  FILE_ACCESS_REVOKED: "文件授权已失效，请重新选择",
  FILE_ACCESS_DENIED: "没有文件写入权限，请选择可写文件夹",
  PERMISSION_NOT_DECLARED: "小程序未声明文件权限",
  PERMISSION_DENIED: "小程序文件权限不可用",
  METHOD_FORBIDDEN: "当前客户端不支持该文件操作",
  METHOD_NOT_FOUND: "请更新小黑盒客户端后再试",
};
function failure(error) {
  return new Error(messages[error.code] || "文件操作失败，请重试");
}
export function createHeyboxAdapter(sdk) {
  return {
    async pickImageFromClick() {
      try {
        const [file] = await sdk.files.pickFiles({
          accept: [".png", ".jpg", ".jpeg", ".webp"],
          mode: "read",
          multiple: false,
        });
        const meta = await file.stat();
        if (meta.size > 8 * 1024 * 1024)
          throw new Error("图片超过 8 MiB，请先缩小");
        const bytes = await file.readBytes();
        return new File([bytes], file.name);
      } catch (error) {
        if (error.code === "FILE_PICKER_CANCELLED") return null;
        if (!error.code) throw error;
        throw failure(error);
      }
    },
    async saveFromClick(bytes, name) {
      try {
        const file = await sdk.files.saveFile({ suggestedName: name });
        await file.writeBytes(bytes);
        return { status: "saved" };
      } catch (error) {
        if (error.code === "FILE_PICKER_CANCELLED")
          return { status: "cancelled" };
        if (["METHOD_FORBIDDEN", "METHOD_NOT_FOUND"].includes(error.code))
          return { status: "needs-directory" };
        throw failure(error);
      }
    },
    async saveToDirectoryFromClick(bytes, name) {
      try {
        const directory = await sdk.files.pickDirectory({ mode: "readwrite" });
        const file = directory.file(name);
        await file.create({ exclusive: true });
        await file.writeBytes(bytes);
        return { status: "saved" };
      } catch (error) {
        if (error.code === "FILE_PICKER_CANCELLED")
          return { status: "cancelled" };
        throw failure(error);
      }
    },
  };
}
