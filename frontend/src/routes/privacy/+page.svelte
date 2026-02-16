<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
</script>

<SeoHead
	title="Privacy Policy — Ukodus"
	description="Privacy policy for Ukodus. No accounts, no tracking, no ads. Game data stored locally."
	url="https://ukodus.now/privacy/"
/>

<main class="wrap">
	<section class="section" style="border-top: none; margin-top: 0">
		<h2>Privacy Policy</h2>
		<p><strong>Last updated:</strong> February 14, 2026</p>
		<p>
			Ukodus is a Sudoku puzzle game developed by Patrick Deutsch. This
			privacy policy explains how we handle your information across the web
			app at <a href="https://ukodus.now">ukodus.now</a> and the iOS app.
		</p>
	</section>

	<section class="section">
		<h2>Web Version</h2>
		<p>When playing on <a href="https://ukodus.now/play/">ukodus.now</a>, the following applies:</p>
		<div class="grid">
			<div class="card" style="grid-column: span 6">
				<h3>Anonymous Gameplay Data</h3>
				<p>Game results&mdash;puzzle data, solve time, mistakes, and hints used&mdash;are submitted to the server for leaderboard and puzzle analytics. No personal information is attached.</p>
			</div>
			<div class="card" style="grid-column: span 6">
				<h3>Player ID</h3>
				<p>A randomly generated player ID is stored in your browser's localStorage. It is never linked to your identity, email, or any account. No sign-up is required.</p>
			</div>
			<div class="card" style="grid-column: span 6">
				<h3>Move Log</h3>
				<p>Move actions are recorded with timestamps for anti-cheat verification. This data is used solely to validate leaderboard submissions.</p>
			</div>
			<div class="card" style="grid-column: span 6">
				<h3>No Accounts Needed</h3>
				<p>You can play, compete on the leaderboard, and share puzzles without creating an account. Everything works anonymously.</p>
			</div>
		</div>
	</section>

	<section class="section">
		<h2>iOS App</h2>
		<p>All game data in the iOS app is stored <strong>locally on your device</strong>: game progress, saved games, statistics, and preferences.</p>
		<div class="grid">
			<div class="card" style="grid-column: span 6">
				<h3>Apple Game Center</h3>
				<p>If you choose to sign in to Game Center, your scores may appear on leaderboards and achievements sync with your Game Center account. This data is managed by Apple according to their privacy policy.</p>
			</div>
			<div class="card" style="grid-column: span 6">
				<h3>Apple iCloud</h3>
				<p>If you enable iCloud sync, game progress syncs across your Apple devices. Data is stored in your personal iCloud account, managed by Apple according to their privacy policy.</p>
			</div>
		</div>
	</section>

	<section class="section">
		<h2>What We Do NOT Collect</h2>
		<p>Ukodus does not collect any of the following, on any platform:</p>
		<div class="grid">
			<div class="card" style="grid-column: span 4">
				<h3>No Personal Info</h3>
				<p>No names, email addresses, phone numbers, or contact information of any kind.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>No Location Data</h3>
				<p>We never request or store your geographic location, IP-based geolocation, or any location identifiers.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>No Ads or Trackers</h3>
				<p>No advertising networks, no tracking pixels, no analytics SDKs, no advertising identifiers (IDFA). Zero third-party services.</p>
			</div>
		</div>
	</section>

	<section class="section">
		<h2>Children's Privacy</h2>
		<p>Ukodus does not collect personal information from anyone, including children under 13 years of age. The app contains no user-generated content, social features, or in-app purchases.</p>
	</section>

	<section class="section">
		<h2>Data Security</h2>
		<p>All local data is protected by your device's built-in security measures. Web gameplay data is transmitted over HTTPS. iCloud data is protected by Apple's security infrastructure. We do not store passwords or sensitive credentials because no accounts exist.</p>
	</section>

	<section class="section">
		<h2>Changes to This Policy</h2>
		<p>We may update this privacy policy from time to time. Any changes will be reflected with a new "Last updated" date at the top of this page.</p>
	</section>

	<section class="section">
		<h2>Contact</h2>
		<p>If you have questions about this privacy policy, please contact:</p>
		<p><strong>Patrick Deutsch</strong><br />GitHub: <a href="https://github.com/kcirtapfromspace">@kcirtapfromspace</a></p>
	</section>

	<section class="section">
		<h2>Your Rights</h2>
		<p>You can delete all app data at any time by:</p>
		<div class="grid">
			<div class="card" style="grid-column: span 4">
				<h3>Delete the App</h3>
				<p>Removing the iOS app from your device deletes all locally stored game data, statistics, and preferences.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>Reset Statistics</h3>
				<p>Use the "Reset Statistics" option in Settings to clear your play history while keeping the app installed.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>Clear Browser Data</h3>
				<p>For the web version, clear your browser's localStorage for ukodus.now to remove your anonymous player ID and saved game state.</p>
			</div>
		</div>
	</section>
</main>
