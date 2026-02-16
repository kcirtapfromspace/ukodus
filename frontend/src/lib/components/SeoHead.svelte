<script lang="ts">
	interface Props {
		title: string;
		description: string;
		url: string;
		image?: string;
		type?: string;
		jsonLd?: object | object[];
	}

	let { title, description, url, image = 'https://ukodus.now/assets/og-home.png', type = 'website', jsonLd }: Props = $props();

	let jsonLdArray = $derived(jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={image} />
	<meta property="og:site_name" content="Ukodus" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
	{#each jsonLdArray as schema}
		{@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
	{/each}
</svelte:head>
