PHONY: test typecheck

NODE = node
TSC = node_modules/.bin/tsc

test: typecheck
	$(NODE) --test 'src/**/*.test.ts'

typecheck: node_modules
	$(TSC) --noEmit

node_modules: package.json yarn.lock
	yarn install
	touch $@

schema.json: src/schemas.ts scripts/build-json-schema.ts node_modules
	$(NODE) scripts/build-json-schema.ts > $@
