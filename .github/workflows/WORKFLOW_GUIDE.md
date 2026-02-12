# GitHub Actions Workflow Guide

This directory contains the CI/CD configuration for the project. The main workflow is defined in `build-go-renderer.yml`.

## How to Trigger the Go Renderer Build

The workflow is designed to be smart and doesn't run on every single commit to save resources. You can control it using specific keywords in your **commit message**.

### 1. Build Only (`build go action`)

If you want to compile the Go binaries and verify they build correctly (but NOT create a release), include this phrase in your commit message:

> `build go action`

**Example:**
```bash
git commit -m "fix: update renderer logic (build go action)"
```

### 2. Build & Release (`build go release`)

If you want to build the binaries AND create a new **GitHub Release** with the compiled assets attached, use this phrase:

> `build go release`

**Example:**
```bash
git commit -m "chore: release version 0.4.0 (build go release)"
```

*Note: The version number for the release is automatically extracted from `package.json`.*

### 3. Pull Requests

Any Pull Request opened against `main` or `master` will **automatically trigger a build** (without releasing) to ensure the code compiles. You don't need special keywords for PRs.

### 4. Manual Trigger

You can also manually trigger the workflow from the GitHub Actions tab:
1. Go to **Actions** tab in the repository.
2. Select **Build Go Renderer** from the left sidebar.
3. Click the **Run workflow** button.

## Summary Table

| Keyword / Event | Action | Outcome |
| :--- | :--- | :--- |
| `build go action` | Build | Artifacts uploaded to Action Summary (storage) |
| `build go release` | Build + Release | Artifacts uploaded to a new GitHub Release |
| Pull Request | Build | artifacts uploaded to Action Summary |
| (No keyword) | Skip | Workflow runs but skips the build step |
