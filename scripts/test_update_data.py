"""Offline unit tests; they do not call public APIs."""
import unittest

from update_data import extract_coordinates, normalized_record, parse_point, parse_tentative_list_pages


class CoordinateTests(unittest.TestCase):
    def test_datahub_point_is_lat_lon(self):
        self.assertEqual(
            parse_point([-7.6079, 110.2038]),
            {"latitude": -7.6079, "longitude": 110.2038},
        )

    def test_geojson_point_is_lon_lat_when_requested(self):
        self.assertEqual(
            parse_point([110.2038, -7.6079], datahub_lat_lon=False),
            {"latitude": -7.6079, "longitude": 110.2038},
        )

    def test_out_of_range_point_is_rejected(self):
        self.assertIsNone(parse_point([200, 400]))

    def test_missing_coordinates_stay_missing(self):
        self.assertIsNone(extract_coordinates({"fields": {"name_en": "A place"}}, {"name_en": "A place"}))


class NormalizationTests(unittest.TestCase):
    def test_world_heritage_id_builds_record_url(self):
        item = normalized_record("whc001", {
            "fields": {
                "id_no": "592",
                "name_en": "Borobudur Temple Compounds",
                "states_names": "Indonesia",
                "category": "Cultural",
                "date_inscribed": "1991",
                "coordinates": [-7.6079, 110.2038],
            }
        })
        self.assertEqual(item["name"], "Borobudur Temple Compounds")
        self.assertEqual(item["year"], 1991)
        self.assertEqual(item["coordinates"]["latitude"], -7.6079)
        self.assertEqual(item["officialUrl"], "https://whc.unesco.org/en/list/592/")
        self.assertTrue(item["mapEligible"])

    def test_non_geographic_records_are_retained(self):
        item = normalized_record("ich001", {"fields": {"uuid": "abc", "name_en": "A tradition", "country": "Indonesia"}})
        self.assertFalse(item["mapEligible"])
        self.assertIsNone(item["coordinates"])
        self.assertEqual(item["entityType"], "intangible_heritage_element")


class TentativeListTests(unittest.TestCase):
    def test_official_report_candidates_are_kept_separate_and_unmapped(self):
        pages = [""] * 7
        pages[4] = (
            "AFRICA\\n"
            "Angola 27/08/2025\\n"
            "Democratic People's Republic of\\n"
            "Korea 06/02/2026"
        )
        pages[5] = "ASIA AND THE PACIFIC\\nIndonesia 15/04/2025\\nJapan 01/02/2016"
        pages[6] = (
            "ANNEX 3\\nWORLD HERITAGE TENTATIVE LISTS BY REGION\\n"
            "AFRICA\\n"
            "Angola\\n"
            "Corredor do Kwanza – Paysage Culturel CN\\n"
            "A Multi\\nLine Site C\\n"
            "ASIA AND THE PACIFIC\\n"
            "Democratic People's Republic of\\nKorea\\n"
            "Coastal Wetlands in the West Sea N\\n"
            "Indonesia\\n"
            "The Land Below the Wind: Spice Trade Route CN"
        )
        records = parse_tentative_list_pages(pages)
        by_name = {record["name"]: record for record in records}
        self.assertIn("Corredor do Kwanza – Paysage Culturel", by_name)
        self.assertEqual(by_name["Corredor do Kwanza – Paysage Culturel"]["country"], "Angola")
        self.assertEqual(by_name["Corredor do Kwanza – Paysage Culturel"]["category"], "Mixed")
        self.assertEqual(by_name["A Multi Line Site"]["category"], "Cultural")
        korea = by_name["Coastal Wetlands in the West Sea"]
        self.assertEqual(korea["country"], "Democratic People's Republic of Korea")
        self.assertIsNone(korea["coordinates"])
        self.assertFalse(korea["mapEligible"])
        self.assertEqual(korea["status"], "tentative")
        self.assertTrue(korea["id"].startswith("whc_tentative_2026:"))

    def test_tentative_parser_refuses_report_without_annex_three(self):
        with self.assertRaisesRegex(ValueError, "Could not find Annex 3"):
            parse_tentative_list_pages(["not a WHC report"])


if __name__ == "__main__":
    unittest.main()
