# nyc-congestion-explorer. `make help` lists every target.
SHELL := /bin/bash
UV := uv run --project study
.DEFAULT_GOAL := help

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

setup: ## Install Python (uv) and Node (npm) dependencies, Playwright chromium
	cd study && uv sync
	npm ci
	npx playwright install chromium

data: ## Download TLC files (2 at a time), aggregate, reconcile; restartable
	$(UV) python -m congestion.download

study: ## Zones, panel, planted-effect simulation, all estimates -> results/*.json
	$(UV) python -m congestion.run_study

export: ## Write api/data/panel.bin, panel.meta.json, zones.geojson, estimator_reference.json
	$(UV) python -m congestion.export

all: data study export ## Full pipeline (downloads ~25 GB, local only)

api-dev: ## GraphQL API on 127.0.0.1:4000
	npm run -w api dev

web-dev: ## Vite dev server on 127.0.0.1:5173
	npm run -w web dev

dev: ## API and web together
	(npm run -w api dev & npm run -w web dev & wait)

test: ## pytest, Vitest (api, web, infra) and write results/tests.json
	$(UV) python -m congestion.test_report

e2e: ## Playwright (against local API and vite preview)
	npm run -w web e2e

bench: ## API latency benchmark -> results/api_latency.json (local, not Lambda)
	npm run -w api bench

contract: ## Regenerate GraphQL types; fails if they differ from git
	npm run -w api codegen
	npm run -w web codegen
	git diff --exit-code -- api/src/generated web/src/graphql/generated

lint: ## ruff, eslint, tsc, vue-tsc
	cd study && uv run ruff check . && uv run ruff format --check .
	npx eslint .
	npx tsc -p api --noEmit
	npx tsc -p infra --noEmit
	npx vue-tsc -p web --noEmit

synth: ## cdk synth (never deploys)
	npm run -w infra synth

infra-test: ## CDK assertion tests and cdk-nag
	npm run -w infra test

results: ## Rebuild results/*.json summary files that derive from other results
	$(UV) python -m congestion.results

readme: ## Write the README numbers table from results/*.json
	$(UV) python -m congestion.readme_numbers

memo: ## Fill reports/memo.md from results/*.json and render memo.pdf
	$(UV) python -m congestion.memo

bullets: ## Print resume bullets from results/*.json (MISSING for absent keys)
	$(UV) python -m congestion.bullets

deploy: ## FOR THE OWNER ONLY (Phase 9): build the web app, then cdk deploy
	npm run -w web build
	npm run -w infra deploy

smoke: ## FOR THE OWNER ONLY: make smoke URL=https://...
	$(UV) python -m congestion.smoke $(URL)

demo: ## Rebuild screenshots and docs/demo.gif from the running app
	npm run -w web screenshots
	npm run -w web demo
	$(UV) python -m congestion.demo_gif

clean: ## Remove build output (not data, not results)
	git clean -fdX -- api/dist web/dist infra/cdk.out playwright-report test-results

.PHONY: demo help setup data study export all api-dev web-dev dev test e2e bench contract lint synth infra-test results readme memo bullets deploy smoke clean
