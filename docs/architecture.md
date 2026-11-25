# Clonalyst architecture

Clonalyst is a planning tool that runs where the data already live. It never needs participant-level data to leave the user's environment.

## Layers

1. **Data contract and checks.** A declared input schema (fields, units, allowed values). Every run produces a check report: missing, invalid, out-of-range and suspected unit errors per field, with held-back rows listed.
2. **Model registry.** Each model is a versioned specification with its source, licence, training population, intended use and coefficients. The engine refuses to run a model whose licence field does not permit the declared use.
3. **Scoring engine.** Gene-specific probabilities for each eligible person.
4. **Local calibration.** Uses people the site has already sequenced. Reports observed to expected ratios with intervals and calibration plots. Refits intercept and slope when carrier counts allow, intercept only when they are limited, and nothing when they are too few, with a visible warning.
5. **Selection planner.** Ranks candidates under model-guided, age-only and random strategies. Forecasts expected carriers, samples needed, cost and a confidence-adjusted sample count. Supports a fixed budget or a fixed carrier target.
6. **Yield tracker (v0.1).** As confirmatory sequencing results return, compares observed with forecast yield, flags drift and updates calibration.
7. **Audit and reporting.** Every run writes a report with inputs, model version, checks, calibration and forecast, so that a protocol, budget or review can cite exactly what was done.

## Deployment targets

- Single-file browser build for evaluation (this demo).
- Python and R packages for analysts inside secure research environments (v0.1).
- Container image for institutional servers and trusted research environments (v0.2).

## What is deliberately out of scope

Diagnosis, return of results to participants, and any claim that a prediction replaces sequencing. Clonalyst decides the order in which people are offered confirmatory testing. The test decides who carries a mutation.
