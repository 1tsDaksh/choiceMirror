# One-time genuine Nebius validation request

This file explicitly requests a single genuine Nebius evaluation of the fictional
OrbitPass case-study and its reworded variant, on the trusted main branch.

The workflow is temporarily enabled for pushes that change exactly this file.
It runs four local-fixture browser journeys with a protected GitHub Actions
NEBIUS_API_KEY secret and stores redacted JSON plus genuine PNG checkpoints.

The test must report failures as failures, not as simulated success.
This trigger should be removed after the one-time evaluation completes.

Requested for SLAY HACKS 2026 evidence; 20 November 2026.
