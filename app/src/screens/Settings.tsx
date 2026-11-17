import { ClaudeConnection } from './ClaudeConnection.tsx';
import { OATS_OPTIONS, REGIONS, type AppSettings } from '../settings.ts';

interface Props {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  saveFailed: boolean;
}

export function SettingsScreen({ settings, update, saveFailed }: Props) {
  return (
    <>
      {saveFailed && (
        <p className="card warn" role="alert">
          Settings couldn’t be saved on this device (private browsing or storage blocked). They’ll reset when the app
          closes.
        </p>
      )}

      <fieldset className="card">
        <legend>Default region</legend>
        <p className="muted small">
          The country whose labelling rules apply — normally where you buy the food. You’ll be able to change it for a
          single product when travelling.
        </p>
        {REGIONS.map((r) => (
          <label key={r.value} className="option">
            <input
              type="radio"
              name="region"
              value={r.value}
              checked={settings.regionChosen && settings.region === r.value}
              onChange={() => update({ region: r.value, regionChosen: true })}
            />
            <span>
              <span className="option-title">{r.label}</span>
              <span className="option-note">{r.note}</span>
            </span>
          </label>
        ))}
        {!settings.regionChosen && (
          <p className="muted small">Not chosen yet — using “Other”, the most cautious rules.</p>
        )}
      </fieldset>

      <fieldset className="card">
        <legend>Oats</legend>
        <p className="muted small">Some people with coeliac disease also react to oats, including gluten-free oats.</p>
        {OATS_OPTIONS.map((o) => (
          <label key={o.value} className="option">
            <input
              type="radio"
              name="oats"
              value={o.value}
              checked={settings.oats === o.value}
              onChange={() => update({ oats: o.value })}
            />
            <span>
              <span className="option-title">{o.label}</span>
              <span className="option-note">{o.note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <ClaudeConnection />

      <p className="muted small">Settings are stored only on this device.</p>
    </>
  );
}
