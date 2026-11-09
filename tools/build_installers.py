"""Zips the macOS installer into site/downloads (the Windows .cmd lives there as is).

The .command goes in a zip because a zip keeps its "can run" permission; a bare download loses it.
Run after editing anything in installers/:  python tools/build_installers.py
"""
import pathlib, zipfile

root = pathlib.Path(__file__).resolve().parent.parent
src, out = root / "installers", root / "site" / "downloads"
out.mkdir(parents=True, exist_ok=True)

cmd = (src / "Install Glowup.command").read_bytes().replace(b"\r\n", b"\n")
info = zipfile.ZipInfo("Install Glowup.command", date_time=(2026, 1, 1, 0, 0, 0))
info.external_attr = (0o100755 << 16)  # regular file, rwxr-xr-x
info.create_system = 3  # unix, so macOS honours the mode
with zipfile.ZipFile(out / "Install-Glowup-mac.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr(info, cmd)
print("built", *sorted(p.name for p in out.iterdir()))
