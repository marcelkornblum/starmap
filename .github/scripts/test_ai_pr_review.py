#!/usr/bin/env python3
"""
Unit tests for Gemini PR Review automation.
"""

import io
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, call, patch
import urllib.error

# Add script directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

import ai_pr_review


def make_mock_response(content_dict_or_str):
    mock = MagicMock()
    if isinstance(content_dict_or_str, str):
        data = content_dict_or_str.encode("utf-8")
    else:
        data = json.dumps(content_dict_or_str).encode("utf-8")
    mock.read.return_value = data
    mock.__enter__.return_value = mock
    mock.__exit__.return_value = False
    return mock


class TestGeminiPRReview(unittest.TestCase):
    def test_current_gemini_models_are_active_gemini_3(self):
        expected_models = [
            "gemini-3.8-flash",
            "gemini-3.7-flash",
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
        ]
        self.assertEqual(ai_pr_review.CURRENT_GEMINI_MODELS, expected_models)
        for model in ai_pr_review.CURRENT_GEMINI_MODELS:
            self.assertTrue(model.startswith("gemini-3."))

    def test_ignore_lists_contain_starmap_paths(self):
        self.assertIn("public/data/", ai_pr_review.IGNORE_PREFIXES)
        self.assertIn("data/", ai_pr_review.IGNORE_PREFIXES)
        self.assertIn(".csv", ai_pr_review.IGNORE_SUFFIXES)

    def test_is_dependabot(self):
        self.assertTrue(ai_pr_review.is_dependabot(author="dependabot[bot]"))
        self.assertTrue(ai_pr_review.is_dependabot(author="Dependabot"))
        self.assertTrue(ai_pr_review.is_dependabot(branch="dependabot/npm_and_yarn/foo-1.0"))
        self.assertFalse(ai_pr_review.is_dependabot(author="marcelkornblum"))
        self.assertFalse(ai_pr_review.is_dependabot(branch="feat/awesome-feature"))

    def test_should_skip_review_when_merged(self):
        skip, reason = ai_pr_review.should_skip_review("42", is_merged=True)
        self.assertTrue(skip)
        self.assertIn("already merged", reason)

        skip, reason = ai_pr_review.should_skip_review("42", is_merged="true")
        self.assertTrue(skip)
        self.assertIn("already merged", reason)

        skip, reason = ai_pr_review.should_skip_review(
            "42", pr_info={"merged": True, "user": {"login": "dev"}}
        )
        self.assertTrue(skip)
        self.assertIn("already merged", reason)

    def test_should_skip_review_when_dependabot(self):
        skip, reason = ai_pr_review.should_skip_review(
            "42", pr_author="dependabot[bot]"
        )
        self.assertTrue(skip)
        self.assertIn("Dependabot", reason)

        skip, reason = ai_pr_review.should_skip_review(
            "42",
            pr_info={
                "user": {"login": "dependabot[bot]"},
                "head": {"ref": "dependabot/npm/foo"},
            },
        )
        self.assertTrue(skip)
        self.assertIn("Dependabot", reason)

    def test_should_not_skip_normal_open_pr(self):
        skip, reason = ai_pr_review.should_skip_review(
            "42",
            pr_author="marcelkornblum",
            is_merged=False,
            pr_info={"merged": False, "user": {"login": "marcelkornblum"}},
        )
        self.assertFalse(skip)
        self.assertEqual(reason, "")

    def test_load_styleguides(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            f1 = os.path.join(tmp_dir, "01-general.md")
            with open(f1, "w", encoding="utf-8") as f:
                f.write("---\ntitle: general\n---\nRule 1: Be clean.")
            f2 = os.path.join(tmp_dir, "02-components.md")
            with open(f2, "w", encoding="utf-8") as f:
                f.write("Rule 2: Keep components pure.")

            content = ai_pr_review.load_styleguides(tmp_dir)
            self.assertIn("## Styleguide: 01-general.md\n\nRule 1: Be clean.", content)
            self.assertIn("## Styleguide: 02-components.md\n\nRule 2: Keep components pure.", content)
            self.assertNotIn("title: general", content)

    @patch("time.sleep")
    @patch("urllib.request.urlopen")
    def test_call_gemini_retries_on_503_and_succeeds(self, mock_urlopen, mock_sleep):
        error_503 = urllib.error.HTTPError(
            url="https://generativelanguage.googleapis.com",
            code=503,
            msg="Service Unavailable",
            hdrs={},
            fp=io.BytesIO(b'{"error": {"code": 503, "message": "High demand"}}'),
        )
        success_resp = make_mock_response(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        {"summary": "Looks good!", "comments": []}
                                    )
                                }
                            ]
                        }
                    }
                ]
            }
        )
        mock_urlopen.side_effect = [error_503, success_resp]

        result = ai_pr_review.call_gemini(
            api_key="fake-key",
            model="gemini-3.8-flash",
            system_instructions="instructions",
            diff_payload="diff",
        )
        self.assertEqual(result["summary"], "Looks good!")
        self.assertEqual(mock_urlopen.call_count, 2)
        self.assertEqual(mock_sleep.call_count, 1)

    @patch("urllib.request.urlopen")
    def test_post_github_review_header_formatting(self, mock_urlopen):
        mock_urlopen.return_value = make_mock_response("{}")
        ai_pr_review.post_github_review(
            repo="owner/repo",
            pr_number="10",
            github_token="token",
            head_sha="sha123",
            summary="Everything looks clean.",
            inline_comments=[],
        )
        call_args = mock_urlopen.call_args
        req = call_args[0][0]
        data = json.loads(req.data.decode("utf-8"))
        self.assertEqual(
            data["body"], "### ⚡ Gemini Code Review\n\nEverything looks clean."
        )

    def test_filter_open_prior_bot_threads(self):
        threads_data = [
            {
                "id": "PRRT_thread1",
                "isResolved": False,
                "path": "src/App.tsx",
                "line": 42,
                "originalLine": 40,
                "comments": {
                    "nodes": [
                        {
                            "databaseId": 1001,
                            "author": {"login": "github-actions[bot]"},
                            "body": "Avoid inline object creations in render loop.",
                            "createdAt": "2026-10-15T10:00:00Z",
                            "originalCommit": {"oid": "commit_111"},
                            "diffHunk": "@@ -40,3 +40,3 @@",
                        },
                        {
                            "databaseId": 1002,
                            "author": {"login": "developer"},
                            "body": "Fixed in latest commit.",
                            "createdAt": "2026-10-15T11:00:00Z",
                        },
                    ]
                },
            },
            # Already resolved thread
            {
                "id": "PRRT_thread2",
                "isResolved": True,
                "comments": {
                    "nodes": [
                        {
                            "author": {"login": "github-actions[bot]"},
                            "originalCommit": {"oid": "commit_111"},
                        }
                    ]
                },
            },
            # Non-bot thread
            {
                "id": "PRRT_thread3",
                "isResolved": False,
                "comments": {
                    "nodes": [
                        {
                            "author": {"login": "human-reviewer"},
                            "originalCommit": {"oid": "commit_111"},
                        }
                    ]
                },
            },
            # Comment made on current head commit (not prior)
            {
                "id": "PRRT_thread4",
                "isResolved": False,
                "comments": {
                    "nodes": [
                        {
                            "author": {"login": "github-actions"},
                            "originalCommit": {"oid": "head_commit_999"},
                            "createdAt": "2026-10-16T12:00:00Z",
                        }
                    ]
                },
            },
        ]

        result = ai_pr_review.filter_open_prior_bot_threads(
            threads_data=threads_data,
            head_sha="head_commit_999",
            latest_commit_date="2026-10-16T12:00:00Z",
        )
        self.assertEqual(len(result), 1)
        t = result[0]
        self.assertEqual(t.thread_id, "PRRT_thread1")
        self.assertEqual(t.comment_id, 1001)
        self.assertEqual(t.path, "src/App.tsx")
        self.assertEqual(t.line, 42)
        self.assertEqual(t.original_line, 40)
        self.assertEqual(t.original_commit_oid, "commit_111")
        self.assertEqual(len(t.replies), 1)
        self.assertEqual(t.replies[0], "developer: Fixed in latest commit.")

    @patch("urllib.request.urlopen")
    def test_validate_open_threads_with_gemini(self, mock_urlopen):
        threads = [
            ai_pr_review.OpenReviewThread(
                thread_id="PRRT_1",
                comment_id=1,
                path="src/math.ts",
                line=10,
                original_line=10,
                body="Check divide by zero",
            ),
            ai_pr_review.OpenReviewThread(
                thread_id="PRRT_2",
                comment_id=2,
                path="src/render.ts",
                line=20,
                original_line=20,
                body="Memory leak on dispose",
            ),
        ]
        gemini_response_payload = {
            "evaluations": [
                {
                    "thread_id": "PRRT_1",
                    "resolved": True,
                    "reply": "Resolved: divide by zero guard added.",
                },
                {
                    "thread_id": "PRRT_2",
                    "resolved": False,
                    "reply": "Unresolved: dispose() is still missing.",
                },
            ]
        }
        mock_resp = make_mock_response(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": json.dumps(gemini_response_payload)}]
                        }
                    }
                ]
            }
        )
        mock_urlopen.return_value = mock_resp

        results = ai_pr_review.validate_open_threads_with_gemini(
            api_key="fake-key",
            model="gemini-3.8-flash",
            system_instructions="instructions",
            threads=threads,
            validation_payload="payload",
        )
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0].thread_id, "PRRT_1")
        self.assertTrue(results[0].resolved)
        self.assertEqual(results[0].reply, "Resolved: divide by zero guard added.")
        self.assertEqual(results[1].thread_id, "PRRT_2")
        self.assertFalse(results[1].resolved)
        self.assertEqual(results[1].reply, "Unresolved: dispose() is still missing.")

    @patch("urllib.request.urlopen")
    def test_run_prior_comments_pass_replies_to_all_and_resolves_only_fixed(
        self, mock_urlopen
    ):
        graphql_query_response = {
            "repository": {
                "pullRequest": {
                    "headRefOid": "head_999",
                    "commits": {
                        "nodes": [
                            {
                                "commit": {
                                    "oid": "head_999",
                                    "committedDate": "2026-10-16T12:00:00Z",
                                }
                            }
                        ]
                    },
                    "reviewThreads": {
                        "nodes": [
                            {
                                "id": "PRRT_fixed",
                                "isResolved": False,
                                "path": "src/fix.ts",
                                "line": 5,
                                "originalLine": 5,
                                "comments": {
                                    "nodes": [
                                        {
                                            "databaseId": 1,
                                            "author": {"login": "github-actions[bot]"},
                                            "body": "Fix this bug.",
                                            "createdAt": "2026-10-15T10:00:00Z",
                                            "originalCommit": {"oid": "commit_111"},
                                            "diffHunk": "",
                                        }
                                    ]
                                },
                            },
                            {
                                "id": "PRRT_unfixed",
                                "isResolved": False,
                                "path": "src/unfix.ts",
                                "line": 15,
                                "originalLine": 15,
                                "comments": {
                                    "nodes": [
                                        {
                                            "databaseId": 2,
                                            "author": {"login": "github-actions[bot]"},
                                            "body": "Fix this other bug.",
                                            "createdAt": "2026-10-15T10:00:00Z",
                                            "originalCommit": {"oid": "commit_111"},
                                            "diffHunk": "",
                                        }
                                    ]
                                },
                            },
                        ]
                    },
                }
            }
        }

        gemini_response = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": json.dumps(
                                    {
                                        "evaluations": [
                                            {
                                                "thread_id": "PRRT_fixed",
                                                "resolved": True,
                                                "reply": "Issue verified fixed.",
                                            },
                                            {
                                                "thread_id": "PRRT_unfixed",
                                                "resolved": False,
                                                "reply": "Still needs attention.",
                                            },
                                        ]
                                    }
                                )
                            }
                        ]
                    }
                }
            ]
        }

        graphql_reply_fixed = {
            "data": {
                "addPullRequestReviewThreadReply": {"comment": {"id": "C_fixed"}}
            }
        }
        graphql_resolve_fixed = {
            "data": {"resolveReviewThread": {"thread": {"id": "PRRT_fixed"}}}
        }
        graphql_reply_unfixed = {
            "data": {
                "addPullRequestReviewThreadReply": {"comment": {"id": "C_unfixed"}}
            }
        }

        mock_urlopen.side_effect = [
            make_mock_response({"data": graphql_query_response}),
            make_mock_response(gemini_response),
            make_mock_response(graphql_reply_fixed),
            make_mock_response(graphql_resolve_fixed),
            make_mock_response(graphql_reply_unfixed),
        ]

        with patch.object(
            ai_pr_review, "_read_file_at_head", return_value="1: const x = 1;"
        ), patch.object(ai_pr_review, "_fetch_commit_file_diff", return_value=""):
            ai_pr_review.run_prior_comments_pass(
                repo="owner/repo",
                pr_number="12",
                github_token="token",
                gemini_key="gemini_key",
                model="gemini-3.8-flash",
                system_instructions="instructions",
                head_sha="head_999",
                files_data={},
            )

        self.assertEqual(mock_urlopen.call_count, 5)


if __name__ == "__main__":
    unittest.main()
