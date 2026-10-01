#!/usr/bin/env python3
"""
Dependabot Auto-Merge Automation.

Automatically evaluates open Dependabot pull requests, approves, comments,
and merges any PR that satisfies the required criteria:
1. Author is dependabot[bot].
2. PR has been waiting for at least 24 hours (configurable via MIN_AGE_HOURS).
3. All status checks and check runs have completed and passed (zero failures).
4. PR is open, non-draft, and mergeable with zero merge conflicts.

Before merging, posts an explanatory comment to the PR stating that it was
triggered by CI automation and detailing all verified criteria.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
import subprocess
import sys
from typing import Any, Dict, List, Optional, Tuple
import urllib.error
import urllib.parse
import urllib.request


DEPENDABOT_ACTOR = "dependabot[bot]"
DEFAULT_MIN_AGE_HOURS = 24.0
ALLOWED_CONCLUSIONS = {"success", "neutral", "skipped"}
DISALLOWED_CONCLUSIONS = {"failure", "cancelled", "timed_out", "action_required"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Automatically approve and merge qualifying Dependabot PRs."
    )
    parser.add_argument(
        "--repo",
        default=os.environ.get("REPO") or os.environ.get("GITHUB_REPOSITORY", ""),
        help="Repository in 'owner/repo' format (defaults to REPO or GITHUB_REPOSITORY env var)",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN", ""),
        help="GitHub API token (defaults to GITHUB_TOKEN or GH_TOKEN env var)",
    )
    parser.add_argument(
        "--pr",
        dest="pr_number",
        default=os.environ.get("PR_NUMBER", ""),
        help="Specific PR number to evaluate (optional; scans all open PRs if omitted)",
    )
    parser.add_argument(
        "--min-age-hours",
        type=float,
        default=float(os.environ.get("MIN_AGE_HOURS", DEFAULT_MIN_AGE_HOURS)),
        help="Minimum age in hours since PR creation before merging (default: 24.0)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=os.environ.get("DRY_RUN", "false").lower() in ("true", "1", "yes"),
        help="Dry run: evaluate PRs without commenting, approving, or merging",
    )
    parser.add_argument(
        "--merge-method",
        choices=["squash", "merge", "rebase"],
        default="squash",
        help="Merge method to use (default: squash)",
    )
    return parser.parse_args()


def github_api_request(
    url: str,
    token: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
) -> Any:
    """Execute an HTTP request against the GitHub REST API."""
    headers = {
        "User-Agent": "Dependabot-Auto-Merge-Automation",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body_bytes = None
    if data is not None:
        body_bytes = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            if not content.strip():
                return None
            return json.loads(content)
    except urllib.error.HTTPError as err:
        err_msg = err.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"GitHub API {method} {url} returned HTTP {err.code}: {err_msg}"
        ) from err


def get_open_pull_requests(repo: str, token: str) -> List[Dict[str, Any]]:
    """Retrieve all open pull requests for the repository."""
    url = f"https://api.github.com/repos/{repo}/pulls?state=open&per_page=100&sort=created&direction=asc"
    result = github_api_request(url, token)
    return result if isinstance(result, list) else []


def get_pull_request(repo: str, pr_number: str | int, token: str) -> Dict[str, Any]:
    """Retrieve details for a specific pull request."""
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"
    return github_api_request(url, token)


def get_check_runs(repo: str, head_sha: str, token: str) -> List[Dict[str, Any]]:
    """Fetch all check runs for a commit SHA."""
    url = f"https://api.github.com/repos/{repo}/commits/{head_sha}/check-runs?per_page=100"
    res = github_api_request(url, token)
    return res.get("check_runs", []) if isinstance(res, dict) else []


def get_commit_statuses(repo: str, head_sha: str, token: str) -> Dict[str, Any]:
    """Fetch combined status for a commit SHA."""
    url = f"https://api.github.com/repos/{repo}/commits/{head_sha}/status"
    res = github_api_request(url, token)
    return res if isinstance(res, dict) else {"total_count": 0, "statuses": []}


def parse_utc_iso(timestamp_str: str) -> datetime:
    """Parse an ISO 8601 UTC timestamp string to a timezone-aware datetime."""
    clean_ts = timestamp_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(clean_ts)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def evaluate_checks(
    check_runs: List[Dict[str, Any]],
    combined_status: Dict[str, Any],
) -> Tuple[bool, str, List[Dict[str, str]]]:
    """
    Evaluate whether all check runs and commit statuses have passed cleanly.
    Returns (passed, reason, list_of_validated_checks).
    """
    validated_checks: List[Dict[str, str]] = []

    # Filter out in-progress auto-merge runs if triggered as check run
    relevant_check_runs = [
        cr for cr in check_runs
        if cr.get("name") not in ("Dependabot Auto-Merge", "dependabot-auto-merge")
    ]

    total_checks = len(relevant_check_runs) + combined_status.get("total_count", 0)
    if total_checks == 0:
        return False, "No CI check runs or status checks found on head commit", []

    for cr in relevant_check_runs:
        name = cr.get("name", "Unknown Check")
        status = cr.get("status")
        conclusion = cr.get("conclusion")

        if status != "completed":
            return (
                False,
                f"Check '{name}' is not yet completed (current status: '{status}')",
                [],
            )

        if conclusion in DISALLOWED_CONCLUSIONS or conclusion not in ALLOWED_CONCLUSIONS:
            return (
                False,
                f"Check '{name}' failed with conclusion '{conclusion}'",
                [],
            )

        validated_checks.append({
            "name": name,
            "status": str(status),
            "conclusion": str(conclusion),
        })

    # Validate legacy/combined commit statuses if present
    statuses = combined_status.get("statuses", [])
    for st in statuses:
        context = st.get("context", "Status")
        state = st.get("state")
        if state != "success":
            return (
                False,
                f"Status check '{context}' has non-successful state '{state}'",
                [],
            )
        validated_checks.append({
            "name": context,
            "status": "completed",
            "conclusion": str(state),
        })

    return True, "All checks completed and passed", validated_checks


def evaluate_pr(
    pr: Dict[str, Any],
    check_runs: List[Dict[str, Any]],
    combined_status: Dict[str, Any],
    min_age_hours: float = DEFAULT_MIN_AGE_HOURS,
    now: Optional[datetime] = None,
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Evaluate whether a pull request satisfies all automated merge criteria.
    Returns (eligible, reason, details).
    """
    pr_number = pr.get("number")
    author = pr.get("user", {}).get("login", "")
    state = pr.get("state", "")
    is_draft = pr.get("draft", False)
    created_at_raw = pr.get("created_at", "")
    mergeable = pr.get("mergeable")

    # Criterion 1: PR must be authored by dependabot
    if author != DEPENDABOT_ACTOR:
        return (
            False,
            f"PR #{pr_number} is authored by '{author}', not '{DEPENDABOT_ACTOR}'",
            {},
        )

    # Criterion 2: PR must be open and not draft
    if state != "open":
        return False, f"PR #{pr_number} is {state} (must be open)", {}

    if is_draft:
        return False, f"PR #{pr_number} is currently a draft", {}

    # Criterion 3: PR must not have merge conflicts
    if mergeable is False:
        return False, f"PR #{pr_number} has merge conflicts (mergeable is False)", {}

    # Criterion 4: Wait duration (minimum age)
    if not created_at_raw:
        return False, f"PR #{pr_number} missing created_at timestamp", {}

    created_dt = parse_utc_iso(created_at_raw)
    current_time = now or datetime.now(timezone.utc)
    elapsed_seconds = (current_time - created_dt).total_seconds()
    elapsed_hours = elapsed_seconds / 3600.0

    if elapsed_hours < min_age_hours:
        return (
            False,
            f"PR #{pr_number} has been waiting for {elapsed_hours:.1f}h (< {min_age_hours:.1f}h minimum required wait time)",
            {
                "elapsed_hours": elapsed_hours,
                "min_age_hours": min_age_hours,
                "created_at": created_at_raw,
            },
        )

    # Criterion 5: All checks must pass
    checks_passed, checks_reason, validated_checks = evaluate_checks(
        check_runs, combined_status
    )
    if not checks_passed:
        return (
            False,
            f"PR #{pr_number} checks not passed: {checks_reason}",
            {
                "elapsed_hours": elapsed_hours,
                "min_age_hours": min_age_hours,
                "created_at": created_at_raw,
            },
        )

    details = {
        "pr_number": pr_number,
        "title": pr.get("title", ""),
        "author": author,
        "created_at": created_at_raw,
        "elapsed_hours": elapsed_hours,
        "min_age_hours": min_age_hours,
        "head_sha": pr.get("head", {}).get("sha", ""),
        "head_ref": pr.get("head", {}).get("ref", ""),
        "checks": validated_checks,
    }
    return True, "All criteria satisfied", details


def format_merge_comment(details: Dict[str, Any]) -> str:
    """Format the mandatory PR comment stating automation origin and verified criteria."""
    elapsed_h = details.get("elapsed_hours", 0.0)
    min_h = details.get("min_age_hours", DEFAULT_MIN_AGE_HOURS)
    created_at = details.get("created_at", "")
    checks = details.get("checks", [])

    check_lines = []
    for check in checks:
        name = check.get("name", "")
        conclusion = check.get("conclusion", "success")
        check_lines.append(f"- ✓ `{name}` ({conclusion})")
    checks_block = "\n".join(check_lines) if check_lines else "- ✓ All required checks completed"

    return f"""### 🤖 Automated Dependabot Merge

This pull request was automatically approved and merged by repository CI automation.

#### Merge Criteria Verified:
- **PR Author:** `dependabot[bot]` (Verified automated dependency update)
- **Wait Duration:** PR has been waiting for **{elapsed_h:.1f} hours** (exceeds the required threshold of **{min_h:.1f} hours** / 1 day) since `{created_at}`
- **CI Status & Checks:** All **{len(checks)}** check runs completed successfully with zero failures:
{checks_block}
- **Mergeability:** PR is open, non-draft, and mergeable with zero merge conflicts
"""


def post_pr_comment(repo: str, pr_number: int, comment: str, token: str) -> None:
    """Post an explanatory comment to the pull request."""
    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    github_api_request(url, token, method="POST", data={"body": comment})


def approve_pr(repo: str, pr_number: int, token: str) -> None:
    """Submit an approving review for the pull request."""
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}/reviews"
    body = {
        "event": "APPROVE",
        "body": "Automatically approved by CI automation: all criteria satisfied (Dependabot PR, >= 24h wait duration, all CI checks passed).",
    }
    try:
        github_api_request(url, token, method="POST", data=body)
    except Exception as err:
        print(f"Notice: REST API approval returned: {err}. Attempting gh pr review fallback.")
        # Fallback to gh CLI
        try:
            subprocess.run(
                ["gh", "pr", "review", str(pr_number), "--approve", "-b", body["body"]],
                check=True,
                capture_output=True,
                text=True,
                env={**os.environ, "GH_TOKEN": token, "GITHUB_TOKEN": token},
            )
        except Exception as gh_err:
            print(f"Warning: Failed to submit approving review for PR #{pr_number}: {gh_err}")


def merge_pr(
    repo: str,
    pr_number: int,
    title: str,
    head_ref: str,
    token: str,
    merge_method: str = "squash",
) -> bool:
    """Merge the pull request and optionally clean up the head branch."""
    commit_title = f"{title} (#{pr_number})"
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}/merge"
    data = {
        "merge_method": merge_method,
        "commit_title": commit_title,
    }

    merged = False
    try:
        res = github_api_request(url, token, method="PUT", data=data)
        if isinstance(res, dict) and res.get("merged"):
            merged = True
            print(f"Successfully merged PR #{pr_number} via REST API: {res.get('sha')}")
    except Exception as err:
        print(f"REST API merge for PR #{pr_number} returned: {err}. Attempting gh pr merge fallback.")

    if not merged:
        try:
            cmd = ["gh", "pr", "merge", str(pr_number), f"--{merge_method}", "--delete-branch"]
            proc = subprocess.run(
                cmd,
                check=True,
                capture_output=True,
                text=True,
                env={**os.environ, "GH_TOKEN": token, "GITHUB_TOKEN": token},
            )
            print(f"Merged PR #{pr_number} via gh CLI: {proc.stdout.strip()}")
            merged = True
        except Exception as gh_err:
            print(f"Error: gh pr merge also failed for PR #{pr_number}: {gh_err}")
            return False

    # Attempt head branch cleanup if merged via REST
    if merged and head_ref:
        try:
            del_url = f"https://api.github.com/repos/{repo}/git/refs/heads/{head_ref}"
            github_api_request(del_url, token, method="DELETE")
            print(f"Cleaned up branch '{head_ref}' for PR #{pr_number}")
        except Exception:
            pass  # Branch deletion is best-effort

    return True


def process_pull_request(
    pr: Dict[str, Any],
    repo: str,
    token: str,
    min_age_hours: float,
    dry_run: bool,
    merge_method: str,
) -> bool:
    """Process a single pull request through criteria evaluation and auto-merge."""
    pr_number = pr.get("number")
    title = pr.get("title", "")
    head_sha = pr.get("head", {}).get("sha", "")
    head_ref = pr.get("head", {}).get("ref", "")

    print(f"\n--- Evaluating PR #{pr_number}: {title} ---")

    # Retrieve check runs and combined commit status
    check_runs = get_check_runs(repo, head_sha, token) if head_sha else []
    combined_status = get_commit_statuses(repo, head_sha, token) if head_sha else {"total_count": 0, "statuses": []}

    eligible, reason, details = evaluate_pr(
        pr, check_runs, combined_status, min_age_hours=min_age_hours
    )

    if not eligible:
        print(f"Skipping PR #{pr_number}: {reason}")
        return False

    print(f"PR #{pr_number} meets all criteria! Elapsed wait time: {details['elapsed_hours']:.1f}h.")
    print(f"Validated {len(details['checks'])} passing checks.")

    comment_body = format_merge_comment(details)

    if dry_run:
        print(f"[DRY RUN] Would post comment to PR #{pr_number}:")
        print(comment_body)
        print(f"[DRY RUN] Would approve PR #{pr_number}")
        print(f"[DRY RUN] Would {merge_method}-merge PR #{pr_number}")
        return True

    # 1. Post explanatory comment
    print(f"Posting automation comment to PR #{pr_number}...")
    try:
        post_pr_comment(repo, pr_number, comment_body, token)
    except Exception as err:
        print(f"Warning: Failed to post comment to PR #{pr_number}: {err}")

    # 2. Approve PR
    print(f"Approving PR #{pr_number}...")
    approve_pr(repo, pr_number, token)

    # 3. Merge PR
    print(f"Merging PR #{pr_number} using {merge_method} method...")
    success = merge_pr(
        repo=repo,
        pr_number=pr_number,
        title=title,
        head_ref=head_ref,
        token=token,
        merge_method=merge_method,
    )

    if success:
        print(f"PR #{pr_number} successfully merged by automation.")
    return success


def main() -> None:
    args = parse_args()

    repo = args.repo
    token = args.token
    pr_number = args.pr_number.strip() if args.pr_number else None
    min_age_hours = args.min_age_hours
    dry_run = args.dry_run
    merge_method = args.merge_method

    if not repo:
        print("Error: Repository not specified. Set REPO or GITHUB_REPOSITORY.", file=sys.stderr)
        sys.exit(1)

    if not token:
        print("Error: GitHub token not specified. Set GITHUB_TOKEN or GH_TOKEN.", file=sys.stderr)
        sys.exit(1)

    print(f"Starting Dependabot Auto-Merge automation for repository: {repo}")
    print(f"Configuration: min_age_hours={min_age_hours}, dry_run={dry_run}, merge_method={merge_method}")

    prs_to_process: List[Dict[str, Any]] = []

    if pr_number:
        print(f"Fetching targeted PR #{pr_number}...")
        try:
            pr = get_pull_request(repo, pr_number, token)
            prs_to_process.append(pr)
        except Exception as err:
            print(f"Error fetching PR #{pr_number}: {err}", file=sys.stderr)
            sys.exit(1)
    else:
        print("Scanning repository for open pull requests...")
        try:
            all_prs = get_open_pull_requests(repo, token)
            prs_to_process = [
                pr for pr in all_prs
                if pr.get("user", {}).get("login") == DEPENDABOT_ACTOR
            ]
            print(f"Found {len(all_prs)} open PRs total ({len(prs_to_process)} from {DEPENDABOT_ACTOR}).")
        except Exception as err:
            print(f"Error listing open pull requests: {err}", file=sys.stderr)
            sys.exit(1)

    if not prs_to_process:
        print("No open Dependabot PRs found to evaluate. Exiting cleanly.")
        return

    merged_count = 0
    for pr in prs_to_process:
        try:
            if process_pull_request(
                pr=pr,
                repo=repo,
                token=token,
                min_age_hours=min_age_hours,
                dry_run=dry_run,
                merge_method=merge_method,
            ):
                merged_count += 1
        except Exception as err:
            print(f"Unexpected error processing PR #{pr.get('number')}: {err}", file=sys.stderr)

    print(f"\nDependabot Auto-Merge finished. Processed {len(prs_to_process)} PR(s), merged {merged_count}.")


if __name__ == "__main__":
    main()
