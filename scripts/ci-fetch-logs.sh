#!/usr/bin/env bash
set -euo pipefail
WORKFLOW_NAME=${1:-ci.yml}
mkdir -p ci-diagnostics
echo "Listing recent runs for workflow: $WORKFLOW_NAME"
RUN_ID=$(gh run list --workflow "$WORKFLOW_NAME" --limit 10 --json databaseId,name,status -q '.[0].databaseId')
if [ -z "$RUN_ID" ]; then
  echo "No runs found for $WORKFLOW_NAME"
  exit 1
fi
echo "Using run id: $RUN_ID"
gh run view "$RUN_ID" --log > ci-diagnostics/run-${RUN_ID}.log
# find failing job name and extract its last 300 lines
JOB_NAME=$(grep -n "** Job **" -n ci-diagnostics/run-${RUN_ID}.log | head -n1 || true)
tail -n 300 ci-diagnostics/run-${RUN_ID}.log > ci-diagnostics/run-${RUN_ID}-tail.log || true
echo "Saved logs to ci-diagnostics/run-${RUN_ID}.log and tail to ci-diagnostics/run-${RUN_ID}-tail.log"
