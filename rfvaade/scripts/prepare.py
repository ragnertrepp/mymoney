#!/usr/bin/env python3
"""RF Vaade branding for the GPL-3.0 RF Sentinel Android FOSS build.

Upstream: https://github.com/CIS-C0/RFSentinel (CIS-C0, GPL-3.0).
No changes to scanner, identifiers, correlations or alert logic.
"""
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

def patch(path: Path, old: str, new: str):
    s = path.read_text(encoding="utf-8")
    if old not in s:
        raise RuntimeError(f"Expected text not found in {path}: {old}")
    path.write_text(s.replace(old, new, 1), encoding="utf-8")

def main(root: Path):
    build=root/"app/build.gradle.kts"
    strings=root/"app/src/main/res/values/strings.xml"
    if not build.is_file() or not strings.is_file():
        raise RuntimeError("Missing RF Sentinel source tree")
    patch(build, 'base.archivesName.set("RFSentinel-v$appVersionName")',
                 'base.archivesName.set("RF-Vaade-v$appVersionName")')
    patch(strings, '<string name="app_name">RF Sentinel</string>',
                   '<string name="app_name">RF Vaade</string>')
    patch(strings, '<string name="tile_label">RF Sentinel</string>',
                   '<string name="tile_label">RF Vaade</string>')
    translations={
      "et": ['Skannimine', 'Peatatud', 'Skanneri olek, käivitamine ja peatamine'],
      "fi": ['Skannaus', 'Pysäytetty', 'Skannerin tila, käynnistys ja pysäytys'],
    }
    for code,(scanning,idle,widget) in translations.items():
        file=root/f"app/src/main/res/values-{code}/strings.xml"
        file.parent.mkdir(parents=True,exist_ok=True)
        file.write_text(
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<resources>\n'
            '    <string name="app_name">RF Vaade</string>\n'
            '    <string name="tile_label">RF Vaade</string>\n'
            f'    <string name="tile_scanning">{scanning}</string>\n'
            f'    <string name="tile_idle">{idle}</string>\n'
            f'    <string name="widget_description">{widget}</string>\n'
            '</resources>\n',encoding="utf-8")
        ET.parse(file)
    ET.parse(strings)
    (root/"RF-VAADE-NOTICE.md").write_text(
        "# RF Vaade (independent derivative)\n\n"
        "Source: CIS-C0/RFSentinel, GPL-3.0, pinned to "
        "4cc1aec3cd821b3c6ca518bcb851e94e19662012.\n"
        "Changes: app launcher/Quick Settings name, ZIP/APK base name, "
        "Estonian and Finnish translations for five resources.\n"
        "RF signatures and BLE/Wi-Fi scanning code unchanged.\n"
        "A matched radio signature does not demonstrate police presence. "
        "Not validated with Estonian/Finnish law enforcement equipment.\n",
        encoding="utf-8"
    )
    print("RF Vaade branding installed. Original detection logic unchanged.")

if __name__=="__main__":
    if len(sys.argv)!=2:
        raise SystemExit("Usage: python3 scripts/prepare.py <rf-sentinel-checkout>")
    main(Path(sys.argv[1]).resolve())
