/** Keep keyboard focus in a modal and return it to the opening control. */
export function modalFocus(node: HTMLElement, close: () => void) {
	const previous = document.activeElement as HTMLElement | null;
	let active = true;
	const previousOverflow = document.body.style.overflow;
	document.body.style.overflow = 'hidden';
	const controls = () => [...node.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], select, textarea, [tabindex="0"]')];
	queueMicrotask(() => { if (active) (controls()[0] ?? node).focus({ preventScroll: true }); });
	function handleKey(event: KeyboardEvent) {
		if (event.key === 'Escape') { event.preventDefault(); close(); }
		if (event.key !== 'Tab') return;
		const items = controls();
		const first = items[0], last = items.at(-1);
		if (!first) { event.preventDefault(); node.focus({ preventScroll: true }); return; }
		if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
			event.preventDefault(); last?.focus({ preventScroll: true });
		} else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
			event.preventDefault(); first.focus({ preventScroll: true });
		}
	}
	window.addEventListener('keydown', handleKey);
	return { destroy() { active = false; document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus({ preventScroll: true }); } };
}
