---
name: validate
description: Validates GitHub issue concerns by writing unit or smoke tests to reproduce reported behavior without fixing it. Use when provided a GitHub issue URL and asked to validate or reproduce a user's concern.
disable-model-invocation: true
---

# validate

* You will be provided a github issue URL. 
* You need to look into the github issue and validate the user's concerns by writing unit tests or smoke tests to ensure the issue is indeed
reproducable and true.
* You are not to fix the issue until asked to later on.
* When creating a PR, do not link the original issue in the PR description or title. Ever.

Once validated, please return these 4 subheaders.
1. Validation Result
2. Root Cause
3. Regression Source (?)
4. What the fix would look like

Once told to apply the fix, ensure:
* The PR title or description does not not link the original issue.
* Runs our git hooks to ensure everything can commit safely. (`spell`, `format`, `biome`, etc)
