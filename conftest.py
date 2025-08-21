"""Pytest configuration for Playwright tests.

Sets global expect timeout for all Playwright assertions.
"""

from playwright.sync_api import expect


def pytest_configure():
    expect.set_options(timeout=20_000)
