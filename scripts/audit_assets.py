#!/usr/bin/env python3
"""Audit the repository's GLB inventory; no network calls or downloads are performed."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_REL = Path("data/asset_manifest.json")
STATE_REL = Path("data/asset_audit_state.json")
REPORT_REL = Path("ASSET_AUDIT_REPORT.md")
GLB_MAGIC = b"glTF"
GLB_VERSION = 2
JSON_CHUNK_TYPE = 0x4E4F534A
SNAKE_CASE_GLB = re.compile(r"^[a-z0-9]+(?:_[a-z0-9]+)*\\.glb$")
REFERENCE_PATTERN = re.compile(r"assets/[A-Za-z0-9_./-]+\\.glb")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inspect_glb(path: Path) -> dict[str, Any]:
    """Validate a GLB v2 header and chunk structure, including its JSON chunk."""
    issues: list[str] = []
    size = path.stat().st_size
    if size < 20:
        return {"valid": False, "issues": ["File is too small to be a GLB v2 container."]}
    try:
        with path.open("rb") as file:
            header = file.read(12)
            if len(header) != 12:
                return {"valid": False, "issues": ["Incomplete GLB header."]}
            magic, version, declared_length = struct.unpack("<4sII", header)
            if magic != GLB_MAGIC:
                issues.append("Missing glTF magic header.")
            if version != GLB_VERSION:
                issues.append(f"GLB version is {version}; expected version 2.")
            if declared_length != size:
                issues.append(f"Header declares {declared_length} bytes, actual file has {size} bytes.")
            offset = 12
            saw_json = False
            chunk_index = 0
            while offset < size:
                chunk_header = file.read(8)
                if len(chunk_header) != 8:
                    issues.append("Incomplete GLB chunk header.")
                    break
                chunk_length, chunk_type = struct.unpack("<II", chunk_header)
                offset += 8
                if chunk_length < 0 or offset + chunk_length > size:
                    issues.append("GLB chunk extends past end of file.")
                    break
                chunk_data = file.read(chunk_length)
                if len(chunk_data) != chunk_length:
                    issues.append("Incomplete GLB chunk data.")
                    break
                if chunk_index == 0 and chunk_type != JSON_CHUNK_TYPE:
                    issues.append("First GLB chunk is not a JSON chunk.")
                if chunk_type == JSON_CHUNK_TYPE:
                    if saw_json:
                        issues.append("Multiple JSON chunks detected.")
                    saw_json = True
                    try:
                        json.loads(chunk_data.decode("utf-8").rstrip(" \\t\\r\\n\\x00"))
                    except (UnicodeDecodeError, json.JSONDecodeError):
                        issues.append("GLB JSON chunk is not valid UTF-8 JSON.")
                offset += chunk_length
                chunk_index += 1
            if offset != size:
                issues.append(f"Chunk parsing ended at byte {offset}; file size is {size}.")
            if not saw_json:
                issues.append("GLB has no JSON chunk.")
    except OSError as exc:
        issues.append(f"Could not read file: {exc}")
    return {"valid": not issues, "issues": issues}


def _asset_files(asset_dir: Path) -> list[Path]:
    if not asset_dir.exists():
        return []
    return sorted(path for path in asset_dir.rglob("*") if path.is_file() and path.suffix.lower() == ".glb")


def _find_references(root: Path) -> tuple[set[str], set[str]]:
    """Return all source references and references occurring in executable/HTML code."""
    all_refs: set[str] = set()
    code_refs: set[str] = set()
    candidates: set[Path] = set()
    for folder_name in ("js", "minigames"):
        folder = root / folder_name
        if folder.exists():
            candidates.update(p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in {".js", ".html"})
    for relative in ("index.html", "data/sites.json", "data/asset_manifest.json"):
        candidate = root / relative
        if candidate.is_file():
            candidates.add(candidate)
    for path in sorted(candidates):
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        refs = set(REFERENCE_PATTERN.findall(text))
        all_refs.update(refs)
        if path.suffix.lower() in {".js", ".html"} and path.name != "asset_manifest.json":
            code_refs.update(refs)
    return all_refs, code_refs


def human_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.1f} KiB"
    return f"{size / (1024 * 1024):.2f} MiB"


def md_escape(value: Any) -> str:
    return str(value if value is not None else "—").replace("|", "\\|").replace("\\n", " ")


def audit_repository(root: Path = ROOT, force: bool = False, checked_at: str | None = None) -> tuple[dict[str, Any], str]:
    manifest_path = root / MANIFEST_REL
    manifest = read_json(manifest_path)
    if not isinstance(manifest, dict) or not isinstance(manifest.get("assets"), list):
        raise ValueError(f"Missing or invalid manifest: {manifest_path}")
    canonical = str(manifest.get("canonicalDirectory", "assets/models")).strip("/")
    if canonical != "assets/models":
        raise ValueError(f"canonicalDirectory must be assets/models, not {canonical!r}")
    asset_dir = root / canonical
    specs = manifest["assets"]
    spec_by_path = {item["path"]: item for item in specs}
    if len(spec_by_path) != len(specs):
        raise ValueError("Duplicate asset paths in data/asset_manifest.json")
    for item in specs:
        if not item.get("path", "").startswith(canonical + "/") or not item.get("path", "").lower().endswith(".glb"):
            raise ValueError(f"Every manifest asset must be a .glb under {canonical}/: {item.get('path')}")

    previous = read_json(root / STATE_REL)
    previous_assets = previous.get("assets", {}) if isinstance(previous, dict) and isinstance(previous.get("assets"), dict) else None
    baseline_exists = previous_assets is not None and bool(previous.get("baselineInitialized", False))
    timestamp = checked_at or utc_now()

    all_assets = _asset_files(asset_dir)
    current: dict[str, dict[str, Any]] = {}
    for path in all_assets:
        rel = path.relative_to(root).as_posix()
        info = inspect_glb(path)
        current[rel] = {
            "path": rel,
            "sizeBytes": path.stat().st_size,
            "sha256": sha256_file(path),
            "validGlb": info["valid"],
            "issues": info["issues"],
            "filenameConforms": bool(SNAKE_CASE_GLB.fullmatch(path.name)),
        }

    all_refs, code_refs = _find_references(root)
    actual_paths = set(current)
    expected_paths = set(spec_by_path)
    unregistered = sorted(actual_paths - expected_paths)
    outside: list[str] = []
    assets_root = root / "assets"
    if assets_root.exists():
        outside = sorted(p.relative_to(root).as_posix() for p in assets_root.rglob("*")
                         if p.is_file() and p.suffix.lower() == ".glb" and not p.relative_to(root).as_posix().startswith(canonical + "/"))
    non_glb_in_model_folder = sorted(p.relative_to(root).as_posix() for p in asset_dir.rglob("*")
                                     if p.is_file() and p.name != "README.md" and p.suffix.lower() != ".glb") if asset_dir.exists() else []
    legacy_refs = sorted(ref for ref in all_refs if not ref.startswith(canonical + "/"))
    broken_unregistered_refs = sorted(ref for ref in all_refs if ref not in actual_paths and ref not in expected_paths)
    missing_required = sorted(spec["path"] for spec in specs if spec.get("requiredForRuntime") and spec["path"] not in actual_paths)
    missing_planned = sorted(spec["path"] for spec in specs if spec.get("requirement") == "planned" and spec["path"] not in actual_paths)
    missing_optional = sorted(spec["path"] for spec in specs if spec.get("requirement") == "optional" and spec["path"] not in actual_paths)
    present_unreferenced = sorted(path for path in actual_paths if path not in code_refs)
    invalid_glb = sorted(path for path, info in current.items() if not info["validGlb"])
    invalid_names = sorted(path for path, info in current.items() if not info["filenameConforms"])
    recommended_max = int(manifest.get("maxRecommendedBytes", 5 * 1024 * 1024))
    oversized = sorted((path, info["sizeBytes"]) for path, info in current.items() if info["sizeBytes"] > recommended_max)

    if baseline_exists:
        prev_paths = set(previous_assets)
        added_since = sorted(actual_paths - prev_paths)
        removed_since = sorted(prev_paths - actual_paths)
        changed_since = sorted(path for path in actual_paths & prev_paths
                               if current[path]["sha256"] != previous_assets[path].get("sha256"))
        comparison_note = "Compared with the previous asset audit baseline."
    else:
        added_since, removed_since, changed_since = [], [], []
        comparison_note = "Initial baseline: additions and removals will be comparable from the next audit onwards."

    state = {
        "schemaVersion": "1.0.0",
        "baselineInitialized": True,
        "checkedAt": timestamp,
        "forcedRun": bool(force),
        "canonicalDirectory": canonical,
        "assets": {path: {"sha256": item["sha256"], "sizeBytes": item["sizeBytes"], "validGlb": item["validGlb"]}
                   for path, item in sorted(current.items())},
    }

    runtime_specs = [spec for spec in specs if spec.get("requiredForRuntime")]
    site_specs = [spec for spec in specs if spec.get("group") == "unesco_site"]
    prop_specs = [spec for spec in specs if spec.get("group") == "optional_prop"]
    runtime_present = sum(1 for spec in runtime_specs if spec["path"] in actual_paths)
    site_present = sum(1 for spec in site_specs if spec["path"] in actual_paths)
    props_present = sum(1 for spec in prop_specs if spec["path"] in actual_paths)
    status = "PASS — runtime asset set complete" if not missing_required and not invalid_glb and not outside and not legacy_refs and not unregistered else "ACTION REQUIRED — check findings below"
    if missing_planned or missing_optional:
        status += "; planned/optional assets remain outstanding"

    lines: list[str] = [
        "# 3D Asset Audit Report",
        "",
        f"Last checked: {timestamp}",
        f"Run mode: {'FORCED full scan' if force else 'Scheduled/normal full scan'}",
        f"Canonical model folder: {canonical}/",
        "",
        f"**Overall status: {status}.**",
        "",
        "## Summary",
        "",
        "| Check | Result |",
        "|---|---:|",
        f"| GLB files present in {canonical}/ | {len(actual_paths)} |",
        f"| Required by current app | {runtime_present} / {len(runtime_specs)} present |",
        f"| UNESCO/site model slots | {site_present} / {len(site_specs)} present; {len(missing_planned) + sum(1 for p in missing_optional if spec_by_path[p].get('group') == 'unesco_site')} planned/optional missing |",
        f"| Optional environment props | {props_present} / {len(prop_specs)} present |",
        f"| Unregistered model files | {len(unregistered)} |",
        f"| GLB files outside canonical folder | {len(outside)} |",
        f"| Invalid GLB containers | {len(invalid_glb)} |",
        f"| Non-standard filenames | {len(invalid_names)} |",
        f"| Model files above recommended {human_size(recommended_max)} | {len(oversized)} |",
        "",
        "## Current inventory",
        "",
        "| Path | Size | GLB validation | Manifest role | Code reference |",
        "|---|---:|---|---|---|",
    ]
    for path in sorted(current):
        info = current[path]
        spec = spec_by_path.get(path)
        role = spec.get("label", spec.get("group", "UNREGISTERED")) if spec else "UNREGISTERED — add to manifest"
        ref = "Yes" if path in code_refs else "No"
        glb_status = "PASS" if info["validGlb"] else "INVALID: " + "; ".join(info["issues"])
        name_note = " · filename warning" if not info["filenameConforms"] else ""
        size_note = " · optimize" if info["sizeBytes"] > recommended_max else ""
        lines.append(f"| {md_escape(path)} | {human_size(info['sizeBytes'])} | {md_escape(glb_status + name_note + size_note)} | {md_escape(role)} | {ref} |")
    if not current:
        lines.append("| No GLB files found | — | — | — | — |")

    lines.extend(["", "## Runtime-required assets", "",
                  "| Final filename | Status | Used by |",
                  "|---|---|---|"])
    for spec in runtime_specs:
        present = spec["path"] in actual_paths
        used = ", ".join(spec.get("referencedBy", [])) or "Not registered"
        label = "PRESENT" if present and current[spec["path"]]["validGlb"] else "MISSING" if not present else "INVALID GLB"
        lines.append(f"| {md_escape(spec['path'])} | {label} | {md_escape(used)} |")
    if not runtime_specs:
        lines.append("| No runtime assets defined in manifest | — | — |")

    planned_entries = [spec for spec in specs if spec["path"] in set(missing_planned)]
    optional_entries = [spec for spec in specs if spec["path"] in set(missing_optional)]
    lines.extend(["", "## Missing planned / optional files", "",
                  "Upload each file to the exact path shown. Use a single .glb with embedded textures.",
                  "",
                  "| Expected filename | Priority | Subject | Source / note |",
                  "|---|---|---|---|"])
    for spec in planned_entries + optional_entries:
        link = spec.get("sourceUrl") or ""
        source_note = (f"[Source]({link})" if link else "Source to be identified") + " — " + str(spec.get("license") or "Licence to be verified")
        lines.append(f"| {md_escape(spec['path'])} | {md_escape(spec.get('requirement'))} | {md_escape(spec.get('label'))} | {md_escape(source_note)} |")
    if not planned_entries and not optional_entries:
        lines.append("| No planned or optional asset is missing | — | — | — |")

    lines.extend(["", "## New, changed and removed since previous audit", "",
                  comparison_note, ""])
    if not baseline_exists:
        lines.append("No previous inventory existed. This scan creates the first baseline; it does not label all existing files as new.")
    else:
        for title, values in (("New files", added_since), ("Changed file contents", changed_since), ("Removed files", removed_since)):
            lines.extend([f"### {title}", ""])
            if values:
                lines.extend([f"- {path}" for path in values])
            else:
                lines.append("- None")
            lines.append("")

    lines.extend(["## Findings and cleanup candidates", ""])
    if unregistered:
        lines.extend(["### Newly added but unregistered GLBs", ""])
        lines.extend([f"- {p} — add a role, purpose, source and licence to data/asset_manifest.json." for p in unregistered])
        lines.append("")
    else:
        lines.extend(["- No unregistered GLB is currently present in the canonical model folder.", ""])
    if outside:
        lines.extend(["### GLB files outside the canonical folder", ""])
        lines.extend([f"- {p} — move to {canonical}/ and update any references." for p in outside])
        lines.append("")
    if legacy_refs:
        lines.extend(["### References to old / non-canonical paths", ""])
        lines.extend([f"- {p} — update the source reference to use {canonical}/." for p in legacy_refs])
        lines.append("")
    if broken_unregistered_refs:
        lines.extend(["### Missing references not defined in the manifest", ""])
        lines.extend([f"- {p} — check the reference or add the expected file to the manifest." for p in broken_unregistered_refs])
        lines.append("")
    if present_unreferenced:
        lines.extend(["### Present but not referenced in executable code", "",
                      "These files are retained rather than deleted automatically. Decide whether to reuse or remove them in a separate reviewed change.", ""])
        lines.extend([f"- {p} — {human_size(current[p]['sizeBytes'])}" for p in present_unreferenced])
        lines.append("")
    if invalid_glb:
        lines.extend(["### Invalid GLB files", ""])
        for path in invalid_glb:
            lines.append(f"- {path}: {'; '.join(current[path]['issues'])}")
        lines.append("")
    if invalid_names:
        lines.extend(["### Filenames that do not use lowercase snake_case.glb", ""])
        lines.extend([f"- {p}" for p in invalid_names])
        lines.append("")
    if oversized:
        lines.extend(["### Optimisation warnings", "",
                      f"Recommended maximum is {human_size(recommended_max)}. Large files may load slowly in GitHub Pages / browser gameplay.", ""])
        lines.extend([f"- {p} — {human_size(size)}" for p, size in oversized])
        lines.append("")

    lines.extend(["## What this audit does not do", "",
                  "- It only checks files already in the repository; it does not search for or download new 3D models.",
                  "- It cannot confirm copyright/licence permission, archaeological accuracy, topology quality, texture appearance or in-game scale.",
                  "- New files placed in assets/models/ are reported; register their purpose and licence in data/asset_manifest.json after review.",
                  "",
                  "Full filename list and upload steps: ASSET_UPLOAD_GUIDE.md. Canonical metadata: data/asset_manifest.json.",
                  ""])
    return state, "\\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true",
                        help="Force a full inventory and checksum scan and regenerate the root report.")
    args = parser.parse_args()
    state, report = audit_repository(ROOT, force=args.force)
    (ROOT / STATE_REL).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / STATE_REL).write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")
    (ROOT / REPORT_REL).write_text(report, encoding="utf-8")
    print(report.splitlines()[0])
    print(f"Folder: {state['canonicalDirectory']}/")
    print(f"GLB files found: {len(state['assets'])}")
    print(f"Report written to {REPORT_REL}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
