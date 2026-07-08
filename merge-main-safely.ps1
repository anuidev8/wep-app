# Safe Merge Script: Merge main into sdkrevenueimpl
# This script will help you merge safely with conflict detection

Write-Host "=== Safe Merge: main -> sdkrevenueimpl ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Ensure working directory is clean
Write-Host "Step 1: Checking working directory..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "ERROR: Working directory is not clean. Please commit or stash changes first." -ForegroundColor Red
    Write-Host "Uncommitted files:" -ForegroundColor Red
    Write-Host $status
    exit 1
}
Write-Host "✓ Working directory is clean" -ForegroundColor Green
Write-Host ""

# Step 2: Fetch latest changes
Write-Host "Step 2: Fetching latest changes from remote..." -ForegroundColor Yellow
git fetch origin
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Fetch failed. Check your network connection." -ForegroundColor Yellow
    Write-Host "You can continue with local main branch, but it may be outdated." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
} else {
    Write-Host "✓ Successfully fetched latest changes" -ForegroundColor Green
}
Write-Host ""

# Step 3: Check what will be merged
Write-Host "Step 3: Analyzing differences..." -ForegroundColor Yellow
$commitsAhead = git rev-list --left-right --count sdkrevenueimpl...origin/main
$commits = $commitsAhead -split '\s+'
$commitsInMain = $commits[0]
$commitsInBranch = $commits[1]

Write-Host "Commits in origin/main not in sdkrevenueimpl: $commitsInMain" -ForegroundColor Cyan
Write-Host "Commits in sdkrevenueimpl not in origin/main: $commitsInBranch" -ForegroundColor Cyan
Write-Host ""

if ($commitsInMain -eq "0") {
    Write-Host "✓ No new commits to merge. Branches are already in sync." -ForegroundColor Green
    exit 0
}

Write-Host "Recent commits to be merged:" -ForegroundColor Yellow
git log sdkrevenueimpl..origin/main --oneline --max-count=10
Write-Host ""

# Step 4: Test merge (dry-run)
Write-Host "Step 4: Testing merge for conflicts (dry-run)..." -ForegroundColor Yellow
git merge origin/main --no-commit --no-ff 2>&1 | Tee-Object -Variable mergeOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ No conflicts detected!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 5: Completing merge..." -ForegroundColor Yellow
    git merge --abort  # Abort the test merge
    git merge origin/main --no-ff
    Write-Host "✓ Merge completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠ CONFLICTS DETECTED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Conflicted files:" -ForegroundColor Yellow
    git diff --name-only --diff-filter=U
    Write-Host ""
    Write-Host "To resolve conflicts:" -ForegroundColor Cyan
    Write-Host "1. Review conflicted files listed above"
    Write-Host "2. Edit files to resolve conflicts (look for <<<<<<< markers)"
    Write-Host "3. After resolving, run: git add <resolved-files>"
    Write-Host "4. Complete merge with: git commit"
    Write-Host ""
    Write-Host "To abort this merge: git merge --abort" -ForegroundColor Yellow
}
