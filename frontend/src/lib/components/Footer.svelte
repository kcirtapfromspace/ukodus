<footer id="site-footer" class="wrap">
	<div class="fineprint">
		<div class="copyright">&copy; {new Date().getFullYear()} Ukodus</div>
		<div class="links">
			<a href="/play/">Play</a>
			<a href="/galaxy/">Galaxy</a>
			<a href="/how-to-play/">How to play</a>
			<a href="/difficulty/">Difficulty</a>
			<a href="/about/">About</a>
			<a href="/privacy/">Privacy</a>
			<a href="https://apps.apple.com/us/app/sudoku/id6758485043">iOS App</a>
			<a href="https://github.com/kcirtapfromspace/sudoku-core">GitHub</a>
		</div>
	</div>
</footer>

<style>
	footer { padding-block: 28px 36px; border-top: 1px solid var(--grid-strong); color: var(--muted); }
	.fineprint { gap: 16px 32px; }
	.copyright { font: 10px var(--mono); }
	.fineprint .links { gap: 4px 24px; }
	.links a { display: inline-flex; align-items: center; min-height: 44px; font-size: 11px; text-underline-offset: 4px; }
	@media (max-width: 640px) { .fineprint { align-items: flex-start; flex-direction: column; } .fineprint .links { gap: 0 22px; } }
</style>
