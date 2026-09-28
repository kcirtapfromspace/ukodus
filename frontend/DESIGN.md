# Ukodus interface standards

The shared design lives in `src/app.css`. Use its theme tokens and layout classes across Home, App, Galaxy, Play, the guides, Privacy, and error pages. Component styles should handle the component's structure, rather than redefine the palette or base controls.

## Visual system

- Fraunces for page and section headings, IBM Plex Sans for reading and controls, JetBrains Mono for puzzle codes and numerical data.
- Warm paper surfaces, dark ink, and a restrained terracotta accent. Use the dark and high-contrast token sets rather than hardcoded component colors. Puzzle difficulty and technique-family colors carry meaning and may use their existing palette.
- Use `.wrap`, `.page-intro`, `.section`, `.grid`, `.card`, and `.data-table` for consistent widths, spacing, and hierarchy. Keep reading text around 64–68 characters wide.
- Use `.btn` for primary actions. Keep controls large enough for touch, with visible hover, pressed, disabled, and keyboard-focus states.
- Prefer borders and spacing over stacked shadows. Reserve elevation for dialogs and tooltips.

## Interaction and accessibility

- Every page has one descriptive `h1` and a `main` with `id="main-content"` for the shared skip link.
- Use links for navigation and native buttons for actions. Label inputs and icon-only controls; expose selected and expanded states.
- Use `modalFocus` for dialogs: focus stays inside, Escape closes, background scrolling stops, and focus returns to the opening control.
- Long tables scroll within labeled, keyboard-focusable regions. Pages must fit at 320px without horizontal document scrolling.
- Keep loading, empty, and failed requests distinct. Provide a recovery action when available; do not present a network error as zero results.
- Respect reduced motion. Keep game shortcuts from intercepting keys on page controls or in dialogs.
- Galaxy puzzles support arrow-key navigation and Enter selection. Filters and family navigation remain independent, and Fit view recovers the visible constellation after zooming.
- Label percentages with their denominator: Galaxy coverage describes observed unlocked techniques, not the fraction of all possible Sudoku puzzles.

## Before shipping

Run `npm run check`, `npm test`, and `npm run build`. When changing the canvas palette, rebuild with `scripts/build-wasm.sh` from the repository root and retain generated provenance. Inspect the routes at desktop and phone widths, all three themes, and the relevant interactive states in a browser.

## Galaxy: the observatory

Galaxy deliberately uses a dark, photographic atlas surface in every site theme; the high-contrast theme strengthens its lines and controls. The rest of the site retains its existing palette. Keep this treatment scoped to the Galaxy route.

- Puzzle stars come from the catalog. The procedural background is decorative and never contributes to puzzle or coverage counts.
- `constellations.ts` gives each puzzle a deterministic position inside its technique family. Adding a puzzle or changing play counts must not move existing stars.
- Retain catalog edges. Additional constellation paths form a sparse forest between puzzles that share a canonical named technique. Do not invent similarity scores or treat the atlas as real astronomical coordinates.
- The starfield is painted on resize, with compositor animations for ambient drift. Camera transitions use the existing D3 zoom behavior; no continuous force simulation runs.
- Keep constellation labels readable at every zoom. Use the nearest visible star when touch targets overlap.
- Motion can be paused. Respect `prefers-reduced-motion`, cancel camera transitions when motion stops, and clean up resize, media-query, and WebSocket listeners when leaving.
- Live additions update the visible sky without relocating existing stars. Repeated events update the existing puzzle rather than duplicating it.


## Galaxy: observational reference

- `celestial.ts` pins source counts to Reylé et al. (2021), Table 3: the 422 classified A–Y/D objects within 10 pc, excluding the Sun. M/T/K/L/D/Y/G/F/A counts are 249/45/38/21/20/19/18/8/4. Percentages use this conditional denominator; never call them universal or completeness-corrected census fractions. The 41 untyped objects and 77 planets are excluded. L includes very low-mass stars and brown dwarfs; T/Y are brown-dwarf classes.
- Puzzle primary-technique frequency establishes common-to-rare rank. Largest-remainder apportionment assigns spectral classes using those source proportions across unique loaded puzzles; a family may span classes. Whole-object rounding is disclosed. Filters and repeat plays never alter the denominator. A changed catalog may change classifications, while positions remain fixed.
- Star temperature and absolute V magnitude come from representative M3V/T6V/K5V/L3V/Y0V/G2V/F5V/A0V rows of the Pecaut–Mamajek sequence (2022-04-16 table). This is a representative-class visualization, not a catalog of individual measured stellar spectra.
- Planck spectra plus the Wyman et al. (2013), Eq. 2 approximation to CIE 1931 produce display chromaticity. Relative visible light is `10^(-0.4*(Mv - 4.80))` at equal distance. A shared logarithmic exposure and minimum target size preserve usability; pixel sizes are not physical radii. Do not use play counts or random values as stellar luminosities.
- Nebular texture and gas colors remain an illustrative telescope-inspired backdrop; they do not assert element abundances, observed cloud brightness, or object counts. Never substitute palette percentages for physical abundance measurements.
- A single illustrative galactic nucleus references Sagittarius A* and NASA's approximate four-million-solar-mass value. It is not a puzzle node, completion reward, collapse simulation, or black-hole population fraction. No puzzle-count threshold or mass-fraction-to-number-fraction conversion is permitted.
- Keep astronomy source links, denominator/exposure explanations, and the distinction between observations and artistic presentation in this internal document and `celestial.ts`. Public Galaxy copy stays about Sudoku; omit population charts, source links, star classifications, temperatures, and astronomy lessons. New classes need their own compatible, documented population reference before allocation.

- The public atlas uses the infrared color treatment without a wavelength control. Model-level visible/infrared modes never change puzzle identity, technique, position, or assigned class. D uses a neutral double-circle marker; temperature and flux stay null because the adopted sequence provides no representative white-dwarf row.
- Internally, document the infrared treatment as false color: Vega-normalized K/H/J signals map to R/G/B; H = K + (H-K). Use published J and K magnitudes and H-K. Y0 uses MKO photometry, so treat it as a reference composite, not a simulated instrument. J magnitude sets relative flux at equal distance relative to G2V J=3.60. A common logarithmic stretch uses the faintest J reference (Y0V J=20.15). Keep the display floor distinct from emitted flux.
- The public technique list shows names and puzzle counts and focuses matching puzzles. Its colors remain decorative; do not display spectral letters, class counts, temperatures, or the allocation algorithm. Respect locked families and canonical aliases. Redshift explains wavelength stretching; it must not become an extra stellar class or share the local-star population denominator with distant galaxies.

- Public-facing labels, puzzle details, tooltips, and empty states should help someone choose or play Sudoku. The galaxy is the visual metaphor; astronomy data stays in the rendering model and internal documentation.
