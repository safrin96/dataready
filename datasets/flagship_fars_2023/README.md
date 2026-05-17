# FARS 2023 Flagship Dataset

Source: NHTSA Fatality Analysis Reporting System (FARS) 2023 Initial Release

## Files (download yourself — too large for git)

| File | Size | Source |
|---|---|---|
| accident.csv | 23 MB | [NHTSA FTP](https://static.nhtsa.gov/nhtsa/downloads/FARS/2023/National/FARS2023NationalCSV.zip) |
| FARS_Coding_Validation_Manual_2021.pdf | 13 MB | [regulations.gov](https://downloads.regulations.gov/FMCSA-2022-0003-0185/attachment_1.pdf) |
| Traffic_Safety_Facts_2023_Overview.pdf | 1.8 MB | [crashstats.nhtsa.dot.gov](https://crashstats.nhtsa.dot.gov/Api/Public/Publication/813705) |

## Download

```bash
# CSV (unzip and keep accident.csv)
curl -L -o FARS_2023_NationalCSV.zip "https://static.nhtsa.gov/nhtsa/downloads/FARS/2023/National/FARS2023NationalCSV.zip"
unzip FARS_2023_NationalCSV.zip "FARS2023NationalCSV/accident.csv"
mv FARS2023NationalCSV/accident.csv . && rm -rf FARS2023NationalCSV

# Dictionary PDF
curl -L -o FARS_Coding_Validation_Manual_2021.pdf "https://downloads.regulations.gov/FMCSA-2022-0003-0185/attachment_1.pdf"

# Dashboard PDF (requires multipart extraction — see scripts/download_flagship_datasets.py)
```

## Demo story

NHTSA's official traffic fatality data gets a DataReady Score of **20/F** with 19 issues.
Key findings: mixed content in display labels, sentinel codes stored as text, highly null dimensions exposed as sliceable fields.
