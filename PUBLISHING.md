# Publishing To GitHub (Manual)

This project is prepared for a manual GitHub publish flow.

## 1. Run Prepublish Checks

```bash
./scripts/prepublish_check.sh
```

## 2. Create Public Repo In GitHub UI

1. Go to `https://github.com/new`
2. Repository name: `bicycle_model` (or your preferred name)
3. Visibility: Public
4. Do not initialize with README/license/gitignore (already present locally)
5. Click Create repository

## 3. Add Remote And Push

Replace `<YOUR_GITHUB_USER>` and `<YOUR_REPO>`:

```bash
git remote add origin git@github.com:<YOUR_GITHUB_USER>/<YOUR_REPO>.git
git push -u origin main
```

If using HTTPS instead of SSH:

```bash
git remote add origin https://github.com/<YOUR_GITHUB_USER>/<YOUR_REPO>.git
git push -u origin main
```

## 4. Recommended GitHub Settings

- Optional: enable branch protection on `main` (for example, if you want PR gates)
- Require CI checks before merge
- Enable security alerts
- Add repository topics and short description
