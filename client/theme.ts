export type Theme = 'paper' | 'cosmos';
export type Preference = Theme | 'system';
const storageKey = 'orbit.theme.v3';
let sessionPreference: Preference | undefined;

type NativeTheme = {
  setAppearance?: (appearance: string) => void;
  isSystemDark?: () => boolean;
};
function nativeTheme() {
  return (window as Window & {OrbitNative?: NativeTheme}).OrbitNative;
}
export function readPreference(): Preference {
  if (sessionPreference) return sessionPreference;
  if (typeof window === 'undefined') return 'system';
  try {
    const value = localStorage.getItem(storageKey);
    if (value === 'paper' || value === 'cosmos') return value;
  } catch { /* Storage may be unavailable in a restricted browser. */ }
  return 'system';
}
export function readTheme(): Theme {
  const preference = readPreference();
  if (preference !== 'system') return preference;
  const dark = nativeTheme()?.isSystemDark?.() ?? matchMedia('(prefers-color-scheme: dark)').matches;
  return dark ? 'cosmos' : 'paper';
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  nativeTheme()?.setAppearance?.(theme === 'paper' ? 'paper' : 'night');
}
export function selectTheme(preference: Preference) {
  sessionPreference = preference;
  try { localStorage.setItem(storageKey, preference) } catch { /* Keep the session choice. */ }
  applyTheme(readTheme());
}
export function watchTheme() {
  const media = matchMedia('(prefers-color-scheme: dark)');
  const update = () => applyTheme(readTheme());
  const storageChanged = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return;
    sessionPreference = undefined;
    update();
    window.dispatchEvent(new Event('orbit:theme-changed'));
  };
  update();
  media.addListener(update);
  window.addEventListener('storage', storageChanged);
  window.addEventListener('focus', update);
  document.addEventListener('visibilitychange', update);
  return () => {
    media.removeListener(update);
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener('focus', update);
    document.removeEventListener('visibilitychange', update);
  };
}
