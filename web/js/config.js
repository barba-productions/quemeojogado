const localHosts = new Set(['localhost', '127.0.0.1']);

export const API_BASE_URL = localHosts.has(window.location.hostname)
	? 'http://127.0.0.1:5001/quemeojogado/southamerica-east1'
	: 'https://southamerica-east1-quemeojogado.cloudfunctions.net';
