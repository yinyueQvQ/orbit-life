'use client';
import {useEffect, useState} from 'react';
import {Monitor, Sun, Sparkles} from 'lucide-react';
import {readPreference, selectTheme, type Preference} from '../client/theme';

export default function ThemeToggle() {
  const [preference, setPreference] = useState(readPreference);
  useEffect(() => {
    const sync = () => setPreference(readPreference());
    window.addEventListener('orbit:theme-changed', sync);
    return () => window.removeEventListener('orbit:theme-changed', sync);
  }, []);
  const Icon = preference === 'system' ? Monitor : preference === 'paper' ? Sun : Sparkles;
  return <label className="v2-icon theme-toggle" title="外观模式">
    <Icon size={18} aria-hidden="true"/>
    <select aria-label="外观模式" value={preference} onChange={event => {
      const choice = event.target.value as Preference;
      selectTheme(choice);
      setPreference(choice);
    }}>
      <option value="system">跟随系统</option>
      <option value="paper">纸感日间</option>
      <option value="cosmos">星空夜间</option>
    </select>
  </label>;
}
