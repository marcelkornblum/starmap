#!/usr/bin/env python3
"""
Unit tests for Dependabot Auto-Merge automation.
"""

from datetime import datetime, timezone
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add script directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

import auto_merge_dependabot as am


class TestDependabotAutoMerge(unittest.TestCase):
    def setUp(self):
        self.fixed_now = datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc)

    def test_non_dependabot_pr_rejected(self):
        pr = {
            "number": 101,
            "title": "feat: manual change",
            "user": {"login": "octocat"},
            "state": "open",
            "draft": False,
            "created_at": "2026-09-30T10:00:00Z",
        }
        eligible, reason, _ = am.evaluate_pr(
            pr, check_runs=[], combined_status={}, now=self.fixed_now
        )
        self.assertFalse(eligible)
        self.assertIn("authored by 'octocat'", reason)

    def test_draft_pr_rejected(self):
        pr = {
            "number": 102,
            "title": "chore(deps): update package",
            "user": {"login": "dependabot[bot]"},
            "state": "open",
            "draft": True,
            "created_at": "2026-09-29T10:00:00Z",
        }
        eligible, reason, _ = am.evaluate_pr(
            pr, check_runs=[], combined_status={}, now=self.fixed_now
        )
        self.assertFalse(eligible)
        self.assertIn("draft", reason)

    def test_closed_pr_rejected(self):
        pr = {
            "number": 103,
            "title": "chore(deps): update package",
            "user": {"login": "dependabot[bot]"},
            "state": "closed",
            "draft": False,
            "created_at": "2026-09-29T10:00:00Z",
        }
        eligible, reason, _ = am.evaluate_pr(
            pr, check_runs=[], combined_status={}, now=self.fixed_now
        )
        self.assertFalse(eligible)
        self.assertIn("closed", reason)

    def test_pr_with_merge_conflict_rejected(self):
        pr = {
            "number": 104,
            "title": "chore(deps): update package",
            "user": {"login": "dependabot[bot]"},
            "state": "open",
            "draft": False,
            "mergeable": False,
            "created_at": "2026-09-29T10:00:00Z",
        }
        eligible, reason, _ = am.evaluate_pr(
            pr, check_runs=[], combined_status={}, now=self.fixed_now
        )
        self.assertFalse(eligible)
        self.assertIn("merge conflicts", reason)

    def test_pr_waiting_less_than_24_hours_rejected(self):
        # Created 12 hours ago
        pr = {
            "number": 105,
            "title": "chore(deps): update package",
            "user": {"login": "dependabot[bot]"},
            "state": "open",
            "draft": False,
            "mergeable": True,
            "created_at": "2026-10-01T00:00:00Z",
        }
        eligible, reason, details = am.evaluate_pr(
            pr, check_runs=[], combined_status={}, min_age_hours=24.0, now=self.fixed_now
        )
        self.assertFalse(eligible)
        self.assertIn("waiting for 12.0h", reason)
        self.assertIn("< 24.0h minimum required wait time", reason)

    def test_pr_with_no_checks_rejected(self):
        # Created 26 hours ago
        pr = {
            "number": 106,
            "title": "chore(deps): update package",
            "user": {"login": "dependabot[bot]"},
            "state": "open",
            "draft": False,
            "mergeable": True,
            "created_at": "2026-09-30T10:00:00Z",
        }
        eligible, reason, _ = am.evaluate_pr(
            pr, check_runs=[], combined_status={"total_count": 0, "statuses": []}, now=self.fixed_now
        )
        self.assertFalse(eligible)
        self.assertIn("No CI check runs or status checks found", reason)

    def test_pr_with_in_progress_checks_rejected(self):
        pr = {
            "number": 107,
            "title": "chore(deps): update package",
            "user": {"login": "dependabot[bot]"},
            "state": "open",
            "draft": False,
            "mergeable": True,
            "created_at": "2026-09-30T10:00:00Z",
        }
        check_runs = [
            {"name": "Lint", "status": "completed", "conclusion": "success"},
            {"name": "Test", "status": "in_progress", "conclusion": None},
        ]
        eligible, reason, _ = am.evaluate_pr(
            pr, check_runs=check_runs, combined_status={}, now=self.fixed_now
        )
        self.assertFalse(eligible)
        self.assertIn("Test", reason)
        self.assertIn("in_progress", reason)

    def test_pr_with_failing_check_rejected(self):
        pr = {
            "number": 108,
            "title": "chore(deps): update package",
            "user": {"login": "dependabot[bot]"},
            "state": "open",
            "draft": False,
            "mergeable": True,
            "created_at": "2026-09-30T10:00:00Z",
        }
        check_runs = [
            {"name": "Lint", "status": "completed", "conclusion": "success"},
            {"name": "Test", "status": "completed", "conclusion": "failure"},
        ]
        eligible, reason, _ = am.evaluate_pr(
            pr, check_runs=check_runs, combined_status={}, now=self.fixed_now
        )
        self.assertFalse(eligible)
        self.assertIn("Test", reason)
        self.assertIn("failure", reason)

    def test_qualifying_pr_accepted_and_formatted(self):
        # Created 26 hours ago, all 5 standard checks succeeded
        pr = {
            "number": 109,
            "title": "chore(deps): Bump actions/checkout from 4 to 7",
            "user": {"login": "dependabot[bot]"},
            "state": "open",
            "draft": False,
            "mergeable": True,
            "created_at": "2026-09-30T10:00:00Z",
            "head": {"sha": "abc1234", "ref": "dependabot/checkout-7"},
        }
        check_runs = [
            {"name": "Lint", "status": "completed", "conclusion": "success"},
            {"name": "Type Check", "status": "completed", "conclusion": "success"},
            {"name": "Test", "status": "completed", "conclusion": "success"},
            {"name": "Build", "status": "completed", "conclusion": "success"},
            {"name": "CI Complete", "status": "completed", "conclusion": "success"},
        ]
        eligible, reason, details = am.evaluate_pr(
            pr, check_runs=check_runs, combined_status={}, min_age_hours=24.0, now=self.fixed_now
        )
        self.assertTrue(eligible)
        self.assertEqual(reason, "All criteria satisfied")
        self.assertAlmostEqual(details["elapsed_hours"], 26.0)
        self.assertEqual(len(details["checks"]), 5)

        # Verify comment format
        comment = am.format_merge_comment(details)
        self.assertIn("🤖 Automated Dependabot Merge", comment)
        self.assertIn("repository CI automation", comment)
        self.assertIn("`dependabot[bot]`", comment)
        self.assertIn("26.0 hours", comment)
        self.assertIn("24.0 hours", comment)
        self.assertIn("- ✓ `Lint` (success)", comment)
        self.assertIn("- ✓ `Type Check` (success)", comment)
        self.assertIn("- ✓ `Test` (success)", comment)
        self.assertIn("- ✓ `Build` (success)", comment)
        self.assertIn("- ✓ `CI Complete` (success)", comment)
        self.assertIn("zero merge conflicts", comment)

    def test_process_pull_request_dry_run(self):
        pr = {
            "number": 110,
            "title": "chore(deps): Bump foo from 1 to 2",
            "user": {"login": "dependabot[bot]"},
            "state": "open",
            "draft": False,
            "mergeable": True,
            "created_at": "2026-09-30T10:00:00Z",
            "head": {"sha": "feedbeef", "ref": "dependabot/foo-2"},
        }
        check_runs = [
            {"name": "CI Complete", "status": "completed", "conclusion": "success"}
        ]
        with patch("auto_merge_dependabot.get_check_runs", return_value=check_runs), \
             patch("auto_merge_dependabot.get_commit_statuses", return_value={"total_count": 0, "statuses": []}), \
             patch("auto_merge_dependabot.post_pr_comment") as mock_comment, \
             patch("auto_merge_dependabot.approve_pr") as mock_approve, \
             patch("auto_merge_dependabot.merge_pr") as mock_merge:

            success = am.process_pull_request(
                pr=pr,
                repo="marcelkornblum/starmap",
                token="dummy-token",
                min_age_hours=1.0,
                dry_run=True,
                merge_method="squash",
            )
            self.assertTrue(success)
            mock_comment.assert_not_called()
            mock_approve.assert_not_called()
            mock_merge.assert_not_called()

    def test_process_pull_request_live_execution(self):
        pr = {
            "number": 111,
            "title": "chore(deps): Bump bar from 1 to 2",
            "user": {"login": "dependabot[bot]"},
            "state": "open",
            "draft": False,
            "mergeable": True,
            "created_at": "2026-09-30T10:00:00Z",
            "head": {"sha": "deadbeef", "ref": "dependabot/bar-2"},
        }
        check_runs = [
            {"name": "CI Complete", "status": "completed", "conclusion": "success"}
        ]
        with patch("auto_merge_dependabot.get_check_runs", return_value=check_runs), \
             patch("auto_merge_dependabot.get_commit_statuses", return_value={"total_count": 0, "statuses": []}), \
             patch("auto_merge_dependabot.post_pr_comment") as mock_comment, \
             patch("auto_merge_dependabot.approve_pr") as mock_approve, \
             patch("auto_merge_dependabot.merge_pr", return_value=True) as mock_merge:

            success = am.process_pull_request(
                pr=pr,
                repo="marcelkornblum/starmap",
                token="dummy-token",
                min_age_hours=1.0,
                dry_run=False,
                merge_method="squash",
            )
            self.assertTrue(success)
            mock_comment.assert_called_once()
            mock_approve.assert_called_once()
            mock_merge.assert_called_once()


if __name__ == "__main__":
    unittest.main()
