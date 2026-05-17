# DataReady Final Test Pack

This folder is a reusable, judge-ready dataset/input pack for full DataReady testing.

## Included local files

### NYC TLC bundle
- `nyc_tlc/data_dictionary_trip_records_yellow.pdf`
- `nyc_tlc/taxi_zone_lookup.csv`
- `nyc_tlc/erm2-nwe9.csv`

### UCI bundle
- `uci/uci_adult.csv`

## Source links (real dashboard + dataset + docs)

### NYC TLC (recommended primary proof)
- Trip dataset page: https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page
- Public dashboard/research page: https://www.nyc.gov/site/tlc/about/data-and-research.page
- Yellow trip data dictionary PDF: https://www.nyc.gov/assets/tlc/downloads/pdf/data_dictionary_trip_records_yellow.pdf
- Trip records user guide PDF: https://www.nyc.gov/assets/tlc/downloads/pdf/trip_record_user_guide.pdf

### Microsoft Power BI sample option
- Sample datasets docs: https://learn.microsoft.com/en-us/power-bi/create-reports/sample-datasets
- Contoso PBIX download: https://www.microsoft.com/en-us/download/details.aspx?id=46801
- Regional Sales sample docs: https://learn.microsoft.com/en-us/power-bi/create-reports/sample-regional-sales

## Note about two small placeholder files

If you see these two files in `nyc_tlc/`:
- `trip_record_user_guide.pdf`
- `tlc_factbook_2016.pdf`

They are access-denied HTML placeholders from automated download and should be replaced by downloading the real files from the links above in a browser.

## Recommended test sequence

1. CSV-only run: `nyc_tlc/erm2-nwe9.csv`
2. Multimodal run: same CSV + real dashboard screenshot from TLC public dashboard
3. Full multimodal run: CSV + screenshot + `nyc_tlc/data_dictionary_trip_records_yellow.pdf`
4. Adversarial safety run: `../golden/fixtures/adversarial_prompt_injection_v1.csv`
