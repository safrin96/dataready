# NYC DOE School Quality 2024 Flagship Dataset

Source: New York City Department of Education, School Quality Reports 2023-24

## Files

| File | Size | Source | In git? |
|---|---|---|---|
| school_quality_ems_2024.csv | 500 KB | Converted from Excel | Yes |
| 202324-ems-sqr-results.xlsx | 3.5 MB | [NYC InfoHub](https://infohub.nyced.org/reports/students-and-schools/school-quality/school-quality-reports-and-resources/school-quality-reports-citywide-results) | No |
| 2023-24-educator-guide-ems.pdf | 960 KB | [NYC InfoHub](https://infohub.nyced.org/docs/default-source/default-document-library/2023-24-educator-guide-ems.pdf) | No |
| school_snapshot_FLI_2024.pdf | 428 KB | [Future Leaders Institute](https://www.futureleadersinstitute.org/pdf/Annual%20Reports//NYC%20DOE%20School%20Quality%20Snapshot%20Reports/2023-2024%20FLI%20Charter%20School%20Quality%20Snapshot.pdf) | No |

## Download

```bash
curl -L -o 202324-ems-sqr-results.xlsx "https://infohub.nyced.org/docs/default-source/default-document-library/202324-ems-sqr-results.xlsx"
curl -L -o 2023-24-educator-guide-ems.pdf "https://infohub.nyced.org/docs/default-source/default-document-library/2023-24-educator-guide-ems.pdf"
curl -L -o school_snapshot_FLI_2024.pdf "https://www.futureleadersinstitute.org/pdf/Annual%20Reports//NYC%20DOE%20School%20Quality%20Snapshot%20Reports/2023-2024%20FLI%20Charter%20School%20Quality%20Snapshot.pdf"
```

## Demo story

NYC DOE's official school quality data gets a DataReady Score of **23/F** with 23 issues.
Key findings: 3 critical unlabeled columns from Excel export, metrics that don't map to dashboard labels, 90%+ null columns exposed as dimensions.
