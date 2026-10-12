# VineComputer — an evolving garden of rules

**[Interactive Garden](https://anttiluode.github.io/VineComputer/)** · [Exploratory benchmark](data/benchmark.json)

A zero-build, pure JavaScript developmental-evolution sandbox. Six competing growth-rule families produce visible branching structures. Seven heritable numerical traits determine phototropism, branching, directional persistence, exploration noise, obstacle avoidance, step length, and resource-value weighting. Tournament selection preferentially reproduces successful vines; inheritable mutations sometimes switch the entire growth-rule family. A matched *neutral genetic drift* population starts with identical genomes and has the same mutation and evaluation budget, but does not select parents based on fitness.

Each vine starts from the same stem and grows toward finitely many resource patches. Growing length is costly; colliding with obstacles is costly; reaching a resource yields a one-time reward. The three editable worlds (`patches`, `corridor`, `seasonal`) select different resource geometries and obstacles, including moving resource patches. Fresh worlds are sampled each generation for selection. One distinct holdout world per generation assesses champions; **holdout fitness is not fed back to selection**. The site records both training and holdout scores and lets you replay the visual structure and inspect every generation. Download the full run as JSON.

This is **not a biomechanically realistic simulation of plants, neuronal arborization, genes, reproduction, energy metabolism, or neuronal learning**. Rules are intentionally compact and interpretable. Obstacles and light patches are abstract 2D targets, and the fitness function is chosen by the experimenter. The site is an evolutionary *toy laboratory* that can exhibit failures as well as useful adaptations.

## Try it

Open `index.html` directly in a static web server (ES module imports require HTTP, not necessarily `file://`):

```bash
python -m http.server 8000
# http://localhost:8000/
```

Press **+ 1 generation** or **Run evolution**. Inspect historical specimens by clicking generations in the table, switch to the unseen world, and scrub the growth slider. Change the scenario or population to restart with the same seed. Mutation strength changes subsequent generations only. Click **Export JSON** to preserve the complete lineage record and champion shapes.

## Scientific boundaries

The protocol is intentionally a baseline, not a proof of useful general-purpose computation or a validated model of biological evolution:

- The selected pool uses a 3-way tournament and one elite per generation; the neutral pool randomly picks parents. Their resource budgets and population sizes match, but ecological competition and reproduction are artificial.
- The holdout world is fresh every generation, so single-generation scores are noisy and **not directly paired observations of a fixed test set**. Report multi-seed means, ideally with uncertainty intervals, rather than claiming improvement from one lucky run.
- Genetic mutation affects individual growth within a lifetime, but *the rules are fixed within that lifetime*. There is no synaptic plasticity or environment-written genotype during growth.
- The site does **not** attempt to model actual light capture or diffusion: receiving a resource once is a discrete reward. There is no physical conservation law, seasonal survival, cell differentiation, or biochemical developmental signaling.
- The world generator uses synthetic terrain and a deterministic PRNG. The benchmark is exploratory and was not preregistered independently.

## Reproducibility

`sim.mjs` is an ES module shared by the website, node tests and benchmark. No package install is required except Node itself.

```bash
npm test
npm run benchmark
node experiments/benchmark.mjs --write
```

`data/benchmark.json` contains the same-budget comparison on 8 fixed seeds, 3 worlds, 24 individuals, and 24 generations. Compare selected lineage versus neutral drift on unseen worlds, not just nursery scores. The static website runs independently of this benchmark.

## Next experiment

Introduce *within-lifetime* activity-dependent growth and delayed environmental feedback, then test whether developmental geometry actually improves future signal routing or resilience to damaged connections compared with a fixed graph of equal wiring and state capacity. That would begin connecting the toy to the proposed **neuronal self-changing filter** rather than making branching an aesthetic objective.

MIT licensed. Existing GitHub Pages workflow is preserved.
