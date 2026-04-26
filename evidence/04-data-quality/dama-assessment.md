# DAMA Data Quality Assessment

## Overview

Data quality is assessed against the six DAMA International dimensions. Numeric values are drawn from the automated quality check results in `quality-check-results.json`.

## Accuracy

<!-- User writes narrative prose here -->

| Metric | Value | Threshold | Pass |
|---|---|---|---|
| Invalid sale prices (≤0 or ≥100M) | 0 | 0 | ✓ |
| Invalid bedrooms (<0 or >20) | 0 | 0 | ✓ |

## Completeness

<!-- User writes narrative prose here -->

| Metric | Value | Threshold | Pass |
|---|---|---|---|
| Location records | ≥100,000 | 100,000 | ✓ |
| Property records | ≥100,000 | 100,000 | ✓ |
| Transaction records | ≥500,000 | 500,000 | ✓ |
| Rental index records | ≥500 | 500 | ✓ |
| HPI index records | ≥500 | 500 | ✓ |
| Crime stat records | ≥10,000 | 10,000 | ✓ |
| Mortgage products | 15 | 15 | ✓ |

## Consistency

<!-- User writes narrative prose here -->

## Timeliness

<!-- User writes narrative prose here -->

| Metric | Value | Threshold | Pass |
|---|---|---|---|
| Future sale dates | 0 | 0 | ✓ |

## Validity

<!-- User writes narrative prose here -->

| Metric | Value | Threshold | Pass |
|---|---|---|---|
| Negative crime counts | 0 | 0 | ✓ |
| Invalid sale prices | 0 | 0 | ✓ |
| Invalid bedrooms | 0 | 0 | ✓ |

## Uniqueness

<!-- User writes narrative prose here -->
