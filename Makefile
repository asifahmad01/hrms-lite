# =============================================================
# HRMS Lite — Developer workflow commands
#
# Usage:
#   make install          Install all deps (backend + frontend)
#   make check            Run all quality checks
#   make fix              Auto-fix all fixable issues
#   make be-check         Backend checks only
#   make fe-check         Frontend checks only
# =============================================================

.PHONY: \
	install be-install fe-install \
	check   be-check   fe-check   \
	lint    be-lint    fe-lint    \
	format  be-format  fe-format  \
	fix     be-fix     fe-fix     \
	type-check be-type-check fe-type-check \
	test

# ── Colours ───────────────────────────────────────────────────────────────────
BOLD  := \033[1m
RESET := \033[0m
GREEN := \033[32m
BLUE  := \033[34m

# ─────────────────────────────────────────────────────────────
# Install
# ─────────────────────────────────────────────────────────────

install: be-install fe-install

be-install:
	@echo "$(BOLD)$(BLUE)▶ Installing backend dependencies…$(RESET)"
	pip install -r backend/requirements-dev.txt

fe-install:
	@echo "$(BOLD)$(BLUE)▶ Installing frontend dependencies…$(RESET)"
	cd frontend && npm install


# ─────────────────────────────────────────────────────────────
# Full check (lint + format-check + type-check)
# ─────────────────────────────────────────────────────────────

check: be-check fe-check
	@echo "$(BOLD)$(GREEN)✓ All checks passed.$(RESET)"

be-check: be-lint be-format be-type-check

fe-check:
	@echo "$(BOLD)$(BLUE)▶ Frontend: all checks…$(RESET)"
	cd frontend && npm run check


# ─────────────────────────────────────────────────────────────
# Lint
# ─────────────────────────────────────────────────────────────

lint: be-lint fe-lint

be-lint:
	@echo "$(BOLD)$(BLUE)▶ Backend: ruff lint…$(RESET)"
	cd backend && ruff check .

fe-lint:
	@echo "$(BOLD)$(BLUE)▶ Frontend: eslint…$(RESET)"
	cd frontend && npm run lint


# ─────────────────────────────────────────────────────────────
# Format check (non-destructive — CI-safe)
# ─────────────────────────────────────────────────────────────

format: be-format fe-format

be-format:
	@echo "$(BOLD)$(BLUE)▶ Backend: ruff format check…$(RESET)"
	cd backend && ruff format --check .

fe-format:
	@echo "$(BOLD)$(BLUE)▶ Frontend: prettier check…$(RESET)"
	cd frontend && npm run format:check


# ─────────────────────────────────────────────────────────────
# Fix — auto-correct all fixable issues
# ─────────────────────────────────────────────────────────────

fix: be-fix fe-fix

be-fix:
	@echo "$(BOLD)$(BLUE)▶ Backend: ruff lint --fix + ruff format…$(RESET)"
	cd backend && ruff check --fix . && ruff format .

fe-fix:
	@echo "$(BOLD)$(BLUE)▶ Frontend: eslint --fix + prettier --write…$(RESET)"
	cd frontend && npm run lint:fix && npm run format


# ─────────────────────────────────────────────────────────────
# Type-check
# ─────────────────────────────────────────────────────────────

type-check: be-type-check fe-type-check

be-type-check:
	@echo "$(BOLD)$(BLUE)▶ Backend: mypy…$(RESET)"
	cd backend && mypy app/

fe-type-check:
	@echo "$(BOLD)$(BLUE)▶ Frontend: tsc --noEmit…$(RESET)"
	cd frontend && npm run type-check


# ─────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────

test:
	@echo "$(BOLD)$(BLUE)▶ Backend: pytest…$(RESET)"
	cd backend && pytest
