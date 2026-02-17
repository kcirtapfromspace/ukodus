# Plan: Add Master/Extreme tabs to leaderboard (gated by secrets unlock)

## Context

The leaderboard overlay in `play/index.html` has 6 difficulty tabs (Beginner through Expert). Master and Extreme tiers are missing, even though:
- The backend leaderboard API already supports them (queries filter by difficulty string — no backend changes needed)
- The WASM game can generate/play Master/Extreme puzzles when secrets are unlocked
- Other pages (techniques, difficulty) already gate Master/Extreme content behind `ukodus_secrets` localStorage flag + `body.secrets-unlocked` CSS class

The play page currently checks `ukodus_secrets` to restore WASM game state but does NOT add the `body.secrets-unlocked` CSS class like the other pages do. This needs to be added so the CSS gating pattern works.

## Changes (single file: `frontend/play/index.html`)

### 1. Add secrets-unlocked body class

Add a `<script>` block right after `<body>` (same pattern as `difficulty/index.html` line 200 and `techniques/index.html` line 242):

```html
<script>
if (localStorage.getItem('ukodus_secrets') === '1') {
    document.body.classList.add('secrets-unlocked');
}
</script>
```

### 2. Add CSS gating rules

Add to the existing `<style>` block:

```css
.lb-tab[data-secret] { display: none; }
body.secrets-unlocked .lb-tab[data-secret] { display: inline-block; }
```

### 3. Add Master/Extreme leaderboard tabs

After the existing Expert tab (line 598), add:

```html
<button class="lb-tab" data-diff="Master" data-secret>Master</button>
<button class="lb-tab" data-diff="Extreme" data-secret>Extreme</button>
```

No JS changes needed — the existing tab click handler (lines 1065-1071) already works generically with `tab.dataset.diff` and calls `fetchLeaderboard()`.

## Verification

- With `ukodus_secrets` unset: leaderboard shows 6 tabs (Beginner–Expert)
- With `ukodus_secrets = '1'`: leaderboard shows 8 tabs including Master and Extreme
- Clicking Master/Extreme tabs fetches from API and renders results
- Existing tabs unaffected
