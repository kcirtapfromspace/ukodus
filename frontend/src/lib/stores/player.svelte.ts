const PLAYER_ID_KEY = 'ukodus_player_id';
const PLAYER_TAG_KEY = 'ukodus_player_tag';
const SECRETS_KEY = 'ukodus_secrets';

function generateUUID(): string {
	if (crypto.randomUUID) return crypto.randomUUID();
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
	});
}

class PlayerStore {
	id = $state('');
	tag = $state('');
	secrets = $state(false);

	constructor() {
		if (typeof window === 'undefined') return;

		let id = localStorage.getItem(PLAYER_ID_KEY);
		if (!id) {
			id = generateUUID();
			localStorage.setItem(PLAYER_ID_KEY, id);
		}
		this.id = id;
		this.tag = localStorage.getItem(PLAYER_TAG_KEY) || '';
		this.secrets = localStorage.getItem(SECRETS_KEY) === '1';
	}

	setTag(value: string) {
		this.tag = value;
		localStorage.setItem(PLAYER_TAG_KEY, value);
	}

	setSecrets(value: boolean) {
		this.secrets = value;
		localStorage.setItem(SECRETS_KEY, value ? '1' : '0');
		if (value) {
			document.body.classList.add('secrets-unlocked');
		} else {
			document.body.classList.remove('secrets-unlocked');
		}
	}
}

export const playerStore = new PlayerStore();
