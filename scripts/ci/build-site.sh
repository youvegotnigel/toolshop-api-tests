#!/usr/bin/env bash
# Builds the published site: dashboard at /, Allure at /allure, Playwright report at /playwright,
# plus the history files the next run restores. Used by GitHub Actions and Jenkins.
set -euo pipefail

rm -rf site
if [ -d allure-results ]; then npx allure generate ./allure-results; fi
node scripts/coverage/index.mts --site site
mkdir -p site/history
if [ -f allure-history/history.jsonl ]; then cp allure-history/history.jsonl site/history/allure-history.jsonl; fi
cp coverage-history/history.json site/history/coverage-history.json
touch site/.nojekyll
