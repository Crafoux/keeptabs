import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.js'],
		environment: 'node',
		// No test exists before the first module of src/lib/: remove this
		// line once there is one, so a missing test suite fails the CI.
		passWithNoTests: true,
	},
});
