import { regionLabel, type AppSettings } from '../settings.ts';

const MODES = [
  { icon: '🏷️', title: 'Photograph a label', detail: 'Ingredients, allergen statement and claims' },
  { icon: '▥', title: 'Scan a barcode', detail: 'Looks the product up, then checks the label' },
  { icon: '🍽️', title: 'Photograph a dish', detail: 'For restaurant meals and unpackaged food' },
  { icon: '⌨️', title: 'Type a dish name', detail: 'e.g. “pad thai”, “tempura”' },
];

export function Home({ settings, onOpenSettings }: { settings: AppSettings; onOpenSettings: () => void }) {
  return (
    <>
      {!settings.regionChosen && (
        <section className="card notice" aria-labelledby="choose-region">
          <h2 id="choose-region">Where do you shop?</h2>
          <p>
            Labelling rules differ by country. Until you choose, GlutenLens uses the most cautious rules, so more
            products will come back “Can’t verify”.
          </p>
          <button type="button" className="primary" onClick={onOpenSettings}>
            Choose your region
          </button>
        </section>
      )}

      <p className="context">
        Region: <strong>{regionLabel(settings.region)}</strong> · Oats:{' '}
        <strong>{settings.oats === 'avoid' ? 'avoid all' : 'gluten-free oats OK'}</strong>
      </p>

      <ul className="modes">
        {MODES.map((m) => (
          <li key={m.title}>
            <button type="button" className="mode" disabled aria-describedby="modes-soon">
              <span className="mode-icon" aria-hidden="true">
                {m.icon}
              </span>
              <span className="mode-text">
                <span className="mode-title">{m.title}</span>
                <span className="mode-detail">{m.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p id="modes-soon" className="muted small">
        Checking isn’t available yet — these are being built next.
      </p>

      <p className="muted small disclaimer">
        Not medical advice. GlutenLens never treats missing information as safe. Always check the physical label, and
        ask when eating out.
      </p>
    </>
  );
}
