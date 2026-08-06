import { mount } from 'svelte';
import '@/styles/theme.css';
import { initSentry } from '@/utils/sentry';
import App from './App.svelte';

initSentry('options');
mount(App, { target: document.getElementById('app')! });
