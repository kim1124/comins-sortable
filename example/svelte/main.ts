import { mount } from 'svelte';
import App from './App.svelte';

const target = document.querySelector('#app');
if (target === null) throw new Error('Missing fixture root');
mount(App, { target });
