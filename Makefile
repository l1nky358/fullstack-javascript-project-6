install:
	npm ci

setup:
	npm ci
	cp code/.env.example .env || true
	cd code && npm ci
	cd code && npm run build || true

start:
	npm start

test:
	npm test

lint:
	npm run lint

.PHONY: install setup start test lint
