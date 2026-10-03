"""Package already-built release artifacts using only the Python standard library.

Run from app/: python scripts/package-release.py --date 2026-10-03
Existing version archives are immutable: choose a new version instead of overwriting.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import tempfile
import zipfile


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inventory(directory):
    return [{"path": file.relative_to(directory).as_posix(),
             "bytes": file.stat().st_size, "sha256": digest(file)}
            for file in sorted(directory.rglob("*")) if file.is_file()]


def archive(directory, target):
    expected = inventory(directory)
    with zipfile.ZipFile(target, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as out:
        for entry in expected:
            out.write(directory / entry["path"], entry["path"])
    with zipfile.ZipFile(target) as check:
        assert check.testzip() is None, f"Damaged archive: {target.name}"
        assert sorted(check.namelist()) == sorted(entry["path"] for entry in expected)
        for entry in expected:
            assert hashlib.sha256(check.read(entry["path"])).hexdigest() == entry["sha256"]
    return {"archive": target.name, "bytes": target.stat().st_size,
            "sha256": digest(target), "files": expected}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True, help="Release date in the user's local timezone")
    args = parser.parse_args()
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date)
    app = Path(__file__).resolve().parents[1]
    project = app.parent
    pkg = json.loads((app / "package.json").read_text(encoding="utf-8"))
    lock = json.loads((app / "package-lock.json").read_text(encoding="utf-8"))
    version = pkg["version"]
    assert re.fullmatch(r"\d+\.\d+\.\d+", version)
    assert lock["version"] == lock["packages"][""]["version"] == version
    manifest = json.loads((app / "dist/manifest.json").read_text(encoding="utf-8"))
    assert manifest["version"] == version
    assert manifest["sdkVersion"] == pkg["dependencies"]["@heybox/hb-sdk"]
    verification = json.loads((project / "tmp/production-verification/result.json").read_text(encoding="utf-8"))
    assert verification["version"] == version and verification["errors"] == 0
    guide = project / f"docs/releases/{version}.md"
    output = project / f"releases/v{version}"
    # Fail before copying if a release with this version already exists.
    output.mkdir(parents=True, exist_ok=False)
    temporary_root = project / "tmp"
    temporary_root.mkdir(exist_ok=True)
    assert temporary_root.resolve().is_relative_to(project.resolve())
    with tempfile.TemporaryDirectory(prefix=f"release-{version}-", dir=temporary_root) as temp:
        stage = Path(temp)
        assert stage.resolve().is_relative_to(temporary_root.resolve())
        distributions = {}
        for kind, source in [("web", app / "dist-web"), ("heybox", app / "dist")]:
            assert (source / "index.html").is_file()
            assert (source / "THIRD_PARTY_NOTICES.txt").is_file()
            assert (source / "licenses/NotoSansSC-OFL.txt").is_file()
            assert (source / "licenses/MARD-MIT.txt").is_file()
            target = stage / kind
            shutil.copytree(source, target)
            shutil.copy2(guide, target / "RELEASE.md")
            distributions[kind] = archive(target, output / f"pindou-{kind}-{version}.zip")

        source = stage / "source"
        source.mkdir()
        source_app = source / "app"
        source_app.mkdir()
        # Explicit allowlist: no node_modules, output directories, .env or credentials.
        for directory in ["src", "assets", "public", "scripts", "tests", "e2e", ".agents"]:
            shutil.copytree(app / directory, source_app / directory)
        for filename in ["package.json", "package-lock.json", "index.html", "vite.config.js",
                         "vite.web.config.js", "playwright.config.js", "skills-lock.json", "README.md", "THIRD_PARTY_NOTICES.md"]:
            shutil.copy2(app / filename, source_app / filename)
        shutil.copytree(project / "docs", source / "docs")
        shutil.copy2(project / ".gitignore", source / ".gitignore")
        if (project / ".gitattributes").is_file():
            shutil.copy2(project / ".gitattributes", source / ".gitattributes")
        (source / "README.md").write_text(
            f"# 拼豆工作台 {version} 源码\n\n"
            "应用位于 app/，发布步骤在 docs/releases/，验证记录在 docs/verification/。\n\n"
            "```powershell\ncd app\nnpm ci --legacy-peer-deps\nnpm run build:web\nnpm run build\n```\n\n"
            "生产构建和网页运行不需要 Python；scripts/package-release.py 的 ZIP 打包工具需要 Python 3。\n"
            "远端账号与小程序 ID 由官方 CLI 登录/绑定，没有包含账号凭据。\n", encoding="utf-8")
        if (project / "README.md").is_file():
            shutil.copy2(project / "README.md", source / "README.md")
        forbidden = {"node_modules", ".git", "test-results", "dist", "dist-web"}
        for path in source.rglob("*"):
            assert not forbidden.intersection(path.relative_to(source).parts)
            assert not path.name.startswith(".env")
        distributions["source"] = archive(source, output / f"pindou-source-{version}.zip")

        record = {"name": pkg["heybox"]["name"], "version": version, "releaseDate": args.date,
                  "author": pkg.get("author"), "repository": pkg.get("homepage"),
                  "sdkVersion": manifest["sdkVersion"], "web": "ready-for-static-hosting",
                  "heybox": "build-validated",
                  "remoteStatus": "not-queried-by-packager",
                  "platformStatusRecord": "docs/verification/2026-10-03-publish.md",
                  "distributions": distributions}
        record_file = output / "release-manifest.json"
        record_file.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        shutil.copy2(guide, output / "README.md")
        checksum_files = [output / distributions[key]["archive"] for key in ["web", "heybox", "source"]]
        checksum_files.extend([record_file, output / "README.md"])
        (output / "SHA256SUMS.txt").write_text(
            "".join(f"{digest(file)}  {file.name}\n" for file in checksum_files), encoding="ascii")
        for kind, info in distributions.items():
            print(f"{kind}: {info['archive']} ({info['bytes'] / 1024 / 1024:.2f} MiB), {len(info['files'])} files; CRC and SHA-256 verified")
        print(f"Release created at: {output}")


if __name__ == "__main__":
    main()
