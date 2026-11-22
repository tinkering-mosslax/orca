# Personal Orca build

This fork rebuilds every official Orca release for Windows with the patches in
`patches/` applied (the Glass interface), and publishes it under **Releases** here.
An Orca installed from these releases updates itself from this fork, so it keeps
receiving every official update with the patches on top.

- `../.github/workflows/personal-build.yml` checks for a new official release every
  6 hours and builds it. Run it by hand from the Actions tab (**Run workflow**).
- `personalize.mjs` points the updater at this fork and drops the official
  signature requirement (these builds are unsigned).
- If a patch stops applying to a new release, the run fails and nothing is
  published; the previous personal release stays installed.
- The `personal-build-log` branch holds the latest run's status and log.

Don't use **Sync fork** on this branch: the workflow reads official releases
directly, and syncing would bring back the official CI workflows.
