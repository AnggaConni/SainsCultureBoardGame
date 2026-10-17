"""Offline unit tests; they do not call public APIs."""
import unittest

from update_data import extract_coordinates, normalized_record, parse_point


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


if __name__ == "__main__":
    unittest.main()
