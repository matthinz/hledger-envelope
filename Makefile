NODE = node

test:
	node --test 'src/**/*.test.ts'

schema.json: src/schemas.ts scripts/build-json-schema.ts
	$(NODE) scripts/build-json-schema.ts > $@
