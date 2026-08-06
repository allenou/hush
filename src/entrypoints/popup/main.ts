import '@/styles/theme.css';
import { initSentry } from '@/utils/sentry';
import { mountPopup } from './bootstrap';

initSentry('popup');
void mountPopup(document.getElementById('app')!);
