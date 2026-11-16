/**
 * Bounds to try, in order, when creating the restored window.
 *
 * The browser refuses to create a window that has less than half of its area
 * on a visible screen: for example, a window saved on a monitor that has been
 * disconnected since. Each refusal leads to the next attempt: first the saved
 * position and size, then the size alone, then nothing, so the browser places
 * the window on the current screen itself.
 * @param {import('./restore-plan.js').WindowBounds} bounds
 * @returns {import('./restore-plan.js').WindowBounds[]} at least one set of bounds, the last one empty
 */
export function boundsToTry(bounds) {
	const { left, top, ...size } = bounds;
	const attempts = [{ ...bounds }];
	const hasPosition = left !== undefined || top !== undefined;
	if (hasPosition && Object.keys(size).length > 0) {
		attempts.push(size);
	}
	if (Object.keys(bounds).length > 0) {
		attempts.push({});
	}
	return attempts;
}
