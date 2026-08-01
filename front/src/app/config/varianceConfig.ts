// Centralized configuration for the run-outcome variance display.
//
// The variance fed to StatDistributionBand is the COMBINATORIAL training
// spread only (cards appearing/not-appearing on a given turn). Several
// sources of real run-to-run variation are NOT tracked by the current model
// (e.g. energy/outing event swings, friendship/race RNG, mood drift, hint
// RNG), so the computed band is a LOWER bound on the true tail width.
//
// VARIANCE_MULTIPLIER lets you inflate the displayed spread to compensate
// for those remaining untracked sources. It scales variance (not sigma), so
// the band width grows with sqrt(multiplier). A value of 1 reproduces the raw
// model (combinatorial training spread + now-tracked rest-RNG tails);
// increase it to widen the band further toward the empirically observed tail
// width.
export const VARIANCE_MULTIPLIER = 2;