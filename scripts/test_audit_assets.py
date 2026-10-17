#!/usr/bin/env python3
"""Offline unit tests for scripts/audit_assets.py."""
from __future__ import annotations

import json
import struct
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_assets import audit_repository, inspect_glb  # noqa: E402

JSON_CHUNK_TYPE = 0x4E4F534A


def minimal_valid_glb() -> bytes:
    payload = b"{}  "
    chunk = struct.pack("<II", len(payload), JSON_CHUNK_TYPE) + payload
    total = 12 + len(chunk)
    return struct.pack("<4sII", b"glTF", 2, total) + chunk


class AuditAssetsTests(unittest.TestCase):
    def test_valid_glb_container_is_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sample.glb"
            path.write_bytes(minimal_valid_glb())
            result = inspect_glb(path)
            self.assertTrue(result["valid"], result["issues"])

    def test_bad_glb_header_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.glb"
            path.write_bytes(b"not a glb file at all")
            result = inspect_glb(path)
            self.assertFalse(result["valid"])
            self.assertTrue(result["issues"])

    def test_missing_required_and_new_unregistered_files_are_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "data").mkdir()
            models = root / "assets" / "models"
            models.mkdir(parents=True)
            manifest = {
                "schemaVersion": "1.0.0",
                "canonicalDirectory": "assets/models",
                "maxRecommendedBytes": 1024,
                "assets": [
                    {"id": "needed", "label": "Needed", "path": "assets/models/needed.glb",
                     "group": "board_game", "requirement": "runtime", "requiredForRuntime": True,
                     "referencedBy": ["js/board.js"]},
                    {"id": "planned", "label": "Planned", "path": "assets/models/planned.glb",
                     "group": "unesco_site", "requirement": "planned", "requiredForRuntime": False,
                     "referencedBy": ["data/sites.json"]}
                ]
            }
            (root / "data" / "asset_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            (models / "extra_model.glb").write_bytes(minimal_valid_glb())
            (root / "js").mkdir()
            (root / "js" / "board.js").write_text('loader.load("assets/models/needed.glb");', encoding="utf-8")
            state, report = audit_repository(root, force=True, checked_at="2026-10-17T00:00:00+00:00")
            self.assertIn("assets/models/needed.glb", report)
            self.assertIn("assets/models/planned.glb", report)
            self.assertIn("assets/models/extra_model.glb", report)
            self.assertIn("unregistered", report.lower())
            self.assertIn("extra_model.glb", state["assets"])
            self.assertEqual(len(state["assets"]), 1)

    def test_initial_audit_creates_baseline_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "data").mkdir()
            (root / "assets" / "models").mkdir(parents=True)
            (root / "data" / "asset_manifest.json").write_text(
                json.dumps({"canonicalDirectory":"assets/models","assets":[]}), encoding="utf-8")
            state, report = audit_repository(root, checked_at="2026-10-17T00:00:00+00:00")
            self.assertTrue(state["baselineInitialized"])
            self.assertIn("Initial baseline", report)


if __name__ == "__main__":
    unittest.main(verbosity=2)
