# BLS Employment Situation Flagship Dataset

Source: Federal Reserve Economic Data (FRED) mirroring Bureau of Labor Statistics series

## Files

| File | Size | Source | In git? |
|---|---|---|---|
| employment_situation_2019_2026.csv | 3.7 KB | FRED (merged) | Yes |
| empsit_sep2024.pdf | 270 KB | [BLS](https://www.bls.gov/news.release/archives/empsit_10042024.pdf) | No |
| BLS_Handbook_CES.pdf | 563 KB | [BLS](https://www.bls.gov/opub/hom/pdf/ces-20110307.pdf) | No |

## Series included

| FRED ID | Column | Description |
|---|---|---|
| PAYEMS | total_nonfarm_employment_thousands | All employees, total nonfarm |
| UNRATE | unemployment_rate_u3_pct | Unemployment rate (U-3) |
| U6RATE | unemployment_rate_u6_pct | Total unemployed + marginally attached (U-6) |
| LNS11300000 | labor_force_participation_rate_pct | Civilian labor force participation rate |
| CES0500000001 | total_private_employment_thousands | All employees, total private |
| CES0500000003 | avg_hourly_earnings_all_private | Average hourly earnings |
| AWHAETP | avg_weekly_hours_all_private | Average weekly hours |

## Download PDFs (requires browser — BLS blocks automated downloads)

1. Open https://www.bls.gov/news.release/archives/empsit_10042024.pdf → save as `empsit_sep2024.pdf`
2. Open https://www.bls.gov/opub/hom/pdf/ces-20110307.pdf → save as `BLS_Handbook_CES.pdf`

## Demo story

BLS employment data gets a DataReady Score of **80/B** with 3 issues.
Key findings: date stored as text, two series with gaps (LFPR, private employment). This is the "clean foil" — proves DataReady doesn't over-flag.
