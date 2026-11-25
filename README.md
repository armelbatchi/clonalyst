# Clonalyst

**Gene-specific sequencing prioritization and calibration for precision oncology research.**

Clonalyst explores how research teams and biobanks could plan the search for carriers of specific acquired mutations before confirmatory sequencing. The initial focus is clonal hematopoiesis, including JAK2 and IDH1/2.

## Try the research prototype

[Download the repository ZIP](https://github.com/armelbatchi/clonalyst/archive/refs/heads/main.zip), extract it, and open `demo/index.html` in a modern browser. No installation, account, internet connection or external service is required. The repository also contains the [demo source](demo/index.html).

**Demonstration only:** the model coefficients are illustrative, the example records and outcomes are synthetic, and no clinical or research utility has been established. Do not enter real patient data or use these estimates for decisions.

The demonstration supports:

- Synthetic cohort generation and synthetic CSV import/export.
- Input checks for missing fields, invalid values, ranges and suspected unit errors.
- Gene-specific illustrative scoring and local logistic recalibration with event-count thresholds.
- Comparisons of model-guided, age-only and random sequencing strategies.
- Expected sequencing volume, estimated costs and approximate uncertainty under independent Bernoulli assumptions.
- Illustrative candidate rankings and downloadable planning reports.

The uncertainty calculation does not include model parameter uncertainty. Calibration thresholds and simulated outputs are demonstration assumptions, not validated recommendations.

## Scientific foundation

Clonalyst is a proposed next step inspired by the collaborative CH-Predict work at Washington University.

- [Predictive modeling of clonal hematopoiesis across diverse cohorts](https://doi.org/10.1182/bloodadvances.2025017940), Blood Advances (2026).
- [Original CH-Predict research tool](https://github.com/kbolton-lab/ch-prediction).
- [Independent scientific commentary](https://doi.org/10.1182/bloodadvances.2026021419).

The original study evaluated gene-specific predictive models across 604,547 individuals. The estimated sequencing efficiencies were retrospective, not prospective implementation results.

Clonalyst's demonstration does not include CH-Predict code or coefficients. Access to validated model specifications, institutional datasets, prospective testing and commercial development would require appropriate permissions and agreements.

## Development

| Path | Purpose |
| --- | --- |
| [src/core.js](src/core.js) | Statistical demonstration engine |
| [demo/index.html](demo/index.html) | Standalone browser interface |
| [demo/template.html](demo/template.html) | Interface template |
| [demo/ui.js](demo/ui.js) | Browser controls and reports |
| [demo/example_upload.csv](demo/example_upload.csv) | Small synthetic CSV illustrating the input format |
| [tests/core.test.js](tests/core.test.js) | Automated checks for the statistical engine |
| [tools/build_demo.py](tools/build_demo.py) | Rebuild the standalone page |
| [docs/architecture.md](docs/architecture.md) | Proposed product architecture |
| [docs/roadmap.md](docs/roadmap.md) | Indicative development plan |

Run the engine checks with Node.js:

```sh
node tests/core.test.js
```

Rebuild the browser demonstration with Python 3:

```sh
python3 tools/build_demo.py
```

The future architecture and roadmap describe proposed capabilities, not features already implemented or confirmed institutional commitments. Model provenance, security review, independent validation and prospective feasibility evaluation remain future work.

## Licensing and contact

A software license has not yet been finalized. Public visibility is not a grant of commercial-use rights. Any use of the original CH-Predict models remains subject to the applicable rights and permissions.

Project contact: Armel Landry Batchi-Bouyou, Washington University School of Medicine.
