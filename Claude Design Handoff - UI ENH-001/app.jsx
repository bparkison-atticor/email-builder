const { DesignCanvas, DCSection, DCArtboard } = window;

const Annotation = ({ children }) => (
  <div style={{
    fontSize: 12,
    color: '#525252',
    lineHeight: 1.5,
    background: '#fff',
    border: '1px solid #e5e5e5',
    borderRadius: 6,
    padding: '8px 10px',
    margin: '0 0 8px',
  }}>{children}</div>
);

const App = () => (
  <DesignCanvas title="Email Builder · Form Panel Hierarchy" initialZoom={0.85}>
    <DCSection id="refined" title="Refined from B — no rail, subtler section markers">
      <DCArtboard id="b2" label="B2 · Eyebrow numbers + tinted CTA card" width={420} height={1200}>
        <VariantB2 />
      </DCArtboard>

      <DCArtboard id="b3" label="B3 · Type-only hierarchy (no badges)" width={420} height={1180}>
        <VariantB3 />
      </DCArtboard>
    </DCSection>

    <DCSection id="overview" title="Earlier explorations (for reference)">
      <DCArtboard id="current" label="Current panel" width={420} height={1100}>
        <CurrentMock />
      </DCArtboard>

      <DCArtboard id="cards" label="B · Numbered cards + rails (original)" width={420} height={1280}>
        <VariantA />
      </DCArtboard>

      <DCArtboard id="flat" label="C · Flat with role bars" width={420} height={1320}>
        <VariantB />
      </DCArtboard>

      <DCArtboard id="tabs" label="D · Tabbed" width={420} height={760}>
        <VariantC />
      </DCArtboard>
    </DCSection>
  </DesignCanvas>
);

// Faithful approximation of the current panel for side-by-side comparison.
const CurrentMock = () => (
  <div className="panel-root" style={{ padding: 20, overflowY: 'auto' }}>
    <h1 className="panel-title">Email Builder</h1>

    <h2 className="h2-cap" style={{ marginTop: 0 }}>Template</h2>
    <div className="field"><select defaultValue="postmanLaw">
      <option>Postman Law</option><option>National Disability Center</option><option>Wettermark Keith</option>
    </select></div>

    <h2 className="h2-cap" style={{ marginTop: 18 }}>Subject</h2>
    <div className="note" style={{ marginBottom: 14 }}>
      <strong>Reminder:</strong> Subject lines aren't part of the HTML. Set it directly in SendGrid when creating the send.
    </div>

    <h2 className="h2-cap" style={{ marginTop: 18 }}>Preheader</h2>
    <div className="field">
      <input type="text" defaultValue="See if you qualify for benefits today" />
      <div className="hint">Appears next to the subject in the inbox. 39 chars · aim for under 90.</div>
    </div>

    <h2 className="h2-cap" style={{ marginTop: 18 }}>Body — above CTA</h2>
    <div className="field">
      <div className="mock-editor">
        <div className="mock-editor-toolbar">
          <span className="tb-btn" style={{ fontWeight: 700 }}>B</span>
          <span className="tb-btn">↳</span>
          <span className="tb-btn">•</span>
          <span className="tb-btn">1.</span>
        </div>
        <div className="mock-editor-body">Hi {'{{Client.FirstName}}'}, you may qualify for disability benefits.</div>
      </div>
    </div>

    <h2 className="h2-cap" style={{ marginTop: 18 }}>CTA</h2>
    <div className="field">
      <label className="field-label">Button text</label>
      <input type="text" defaultValue="Check My Eligibility" />
    </div>
    <div className="field">
      <label className="field-label">Destination type</label>
      <div style={{ display: 'flex', gap: 16, marginTop: 2 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 'normal', fontSize: 13 }}>
          <input type="radio" name="ctaTypeOld" defaultChecked style={{ marginRight: 6 }} /> Phone
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 'normal', fontSize: 13 }}>
          <input type="radio" name="ctaTypeOld" style={{ marginRight: 6 }} /> URL variable
        </label>
      </div>
    </div>
    <div className="field">
      <label className="field-label">Phone number</label>
      <input type="text" defaultValue="555-123-4567" />
      <div className="hint">Any format — non-digits stripped for tel: link.</div>
    </div>

    <h2 className="h2-cap" style={{ marginTop: 18 }}>Body — below CTA</h2>
    <div className="field">
      <div className="mock-editor">
        <div className="mock-editor-toolbar">
          <span className="tb-btn" style={{ fontWeight: 700 }}>B</span>
          <span className="tb-btn">↳</span>
          <span className="tb-btn">•</span>
          <span className="tb-btn">1.</span>
        </div>
        <div className="mock-editor-body placeholder">Optional.</div>
      </div>
    </div>

    <h2 className="h2-cap" style={{ marginTop: 18 }}>Test Data <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: 'var(--muted)' }}>— preview only</span></h2>
    <div className="note" style={{ marginBottom: 14 }}>
      <strong>Preview only.</strong> Substitutes Handlebars tokens in the live preview using the JSON below.
    </div>
    <textarea className="mono" style={{ minHeight: 80, whiteSpace: 'pre' }} defaultValue={`{ "Client": { "FirstName": "James" } }`} />
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
