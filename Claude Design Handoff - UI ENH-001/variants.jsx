// Mid-fi panel hierarchy explorations.
// Each variant is a self-contained 420px-wide form panel showing all sections,
// so the user can compare how they segment "Body Above CTA / CTA / Body Below CTA / Test Data".

// ---------- Shared bits ----------

const TemplateSelectMock = () => (
  <div className="field">
    <select defaultValue="postmanLaw">
      <option value="postmanLaw">Postman Law</option>
      <option value="ndc">National Disability Center</option>
      <option value="wk">Wettermark Keith</option>
    </select>
  </div>
);

const RichEditorMock = ({ placeholder, content, height = 100 }) => (
  <div className="mock-editor">
    <div className="mock-editor-toolbar">
      <span className="tb-btn" style={{ fontWeight: 700 }}>B</span>
      <span style={{ width: 1, height: 14, background: '#ddd' }} />
      <span className="tb-btn">↳</span>
      <span style={{ width: 1, height: 14, background: '#ddd' }} />
      <span className="tb-btn">•</span>
      <span className="tb-btn">1.</span>
    </div>
    <div className={`mock-editor-body ${content ? '' : 'placeholder'}`} style={{ minHeight: height }}>
      {content || placeholder}
    </div>
  </div>
);

const PreheaderField = () => (
  <div className="field">
    <input type="text" defaultValue="See if you qualify for benefits today" />
    <div className="hint">Appears next to the subject in the inbox. 39 chars · aim for under 90.</div>
  </div>
);

const TestDataJsonMock = () => (
  <textarea
    className="mono"
    defaultValue={`{\n  "Client": {\n    "FirstName": "James",\n    "LastName": "Harper",\n    "Email": "jharper78@example.com"\n  }\n}`}
    style={{ minHeight: 110, whiteSpace: 'pre' }}
    spellCheck={false}
  />
);

// ---------- Variant A: Card stacks with numbered steps ----------
// Each segment is a clearly-bordered card with a colored left rail and
// a numbered chip. Body Above / CTA / Body Below sit visually as a unit;
// Test Data is set apart with a different rail color + tint.

const VariantA = () => (
  <div className="panel-root variant-a">
    <style>{`
      .variant-a { padding: 20px; overflow-y: auto; }
      .variant-a .seg {
        background: #fff;
        border: 1px solid var(--border);
        border-left: 3px solid #2563eb;
        border-radius: 8px;
        padding: 14px 14px 14px 16px;
        margin-bottom: 12px;
      }
      .variant-a .seg-head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      .variant-a .seg-num {
        width: 22px; height: 22px;
        border-radius: 50%;
        background: #eef2ff;
        color: #2563eb;
        font-size: 12px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .variant-a .seg-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
      .variant-a .seg-desc {
        font-size: 12px;
        color: var(--muted);
        margin-left: auto;
      }
      .variant-a .seg-cta { border-left-color: #000; }
      .variant-a .seg-cta .seg-num { background: #f3f4f6; color: #000; }
      .variant-a .seg-test {
        border-left-color: #d97706;
        background: #fffaf0;
      }
      .variant-a .seg-test .seg-num { background: #fef3c7; color: #b45309; }
      .variant-a .seg-meta {
        border-left-color: #9ca3af;
        background: #fafafa;
      }
      .variant-a .seg-meta .seg-num { background: #f3f4f6; color: #6b7280; }
      /* segmented control reused */
      .variant-a .seg-control {
        display: inline-flex;
        background: #f3f4f6;
        border-radius: 6px;
        padding: 2px;
        gap: 2px;
        width: 100%;
      }
      .variant-a .seg-control button {
        flex: 1;
        background: transparent;
        border: none;
        font-size: 12px;
        font-weight: 500;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        color: var(--muted);
      }
      .variant-a .seg-control button.active {
        background: #fff;
        color: var(--text);
        box-shadow: 0 1px 2px rgba(0,0,0,0.08);
      }
      .variant-a .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .variant-a .cta-preview {
        margin-top: 10px;
        padding: 10px 12px;
        background: #fafafa;
        border-radius: 6px;
        border: 1px dashed var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .variant-a .cta-preview .btn {
        background: #000;
        color: #fff;
        font-weight: 600;
        font-size: 13px;
        padding: 10px 22px;
        border-radius: 4px;
      }
    `}</style>

    <h1 className="panel-title">Email Builder</h1>

    {/* Meta segment: template + preheader, low-priority gray rail */}
    <div className="seg seg-meta">
      <div className="seg-head">
        <span className="seg-num">·</span>
        <span className="seg-title">Template & inbox</span>
      </div>
      <label className="field-label">Template</label>
      <TemplateSelectMock />
      <label className="field-label">Preheader</label>
      <PreheaderField />
    </div>

    {/* 1 — Body above */}
    <div className="seg">
      <div className="seg-head">
        <span className="seg-num">1</span>
        <span className="seg-title">Body — above CTA</span>
      </div>
      <RichEditorMock
        content={<><p style={{ margin: 0 }}>Hi <span style={{ background: '#fef3c7', padding: '0 2px' }}>{'{{Client.FirstName}}'}</span>, you may qualify for disability benefits. Click below to start your free review.</p></>}
      />
    </div>

    {/* 2 — CTA, with brand-black rail to mirror the button */}
    <div className="seg seg-cta">
      <div className="seg-head">
        <span className="seg-num">2</span>
        <span className="seg-title">Call to action</span>
      </div>
      <label className="field-label">Button text</label>
      <input type="text" defaultValue="Check My Eligibility" style={{ marginBottom: 10 }} />

      <label className="field-label">Destination</label>
      <div className="seg-control" style={{ marginBottom: 8 }}>
        <button className="active">📞 Phone</button>
        <button>🔗 URL variable</button>
      </div>
      <input type="text" defaultValue="555-123-4567" />
      <div className="hint">Any format — non-digits stripped for tel: link.</div>

      <div className="cta-preview">
        <span className="btn">Check My Eligibility</span>
      </div>
    </div>

    {/* 3 — Body below */}
    <div className="seg">
      <div className="seg-head">
        <span className="seg-num">3</span>
        <span className="seg-title">Body — below CTA</span>
        <span className="seg-desc">optional</span>
      </div>
      <RichEditorMock placeholder="Optional." height={70} />
    </div>

    {/* Test data — visually different (amber) since it's preview-only */}
    <div className="seg seg-test">
      <div className="seg-head">
        <span className="seg-num">⚙</span>
        <span className="seg-title">Test data</span>
        <span className="seg-desc">preview only</span>
      </div>
      <div className="hint" style={{ marginBottom: 8, marginTop: 0 }}>
        Substitutes <span className="mono">{'{{Client.FirstName}}'}</span> tokens in the live preview. Copied HTML is unaffected.
      </div>
      <TestDataJsonMock />
    </div>
  </div>
);

// ---------- Variant B: Flat with strong dividers, accent strip on titles ----------
// Removes card chrome. Sections separated by full-width rules.
// Each title gets a small colored bar to indicate role
// (content / action / config). Test Data drops below a thicker divider.

const VariantB = () => (
  <div className="panel-root variant-b">
    <style>{`
      .variant-b { padding: 24px 22px; overflow-y: auto; }
      .variant-b .section { padding: 18px 0; border-top: 1px solid var(--border); }
      .variant-b .section:first-of-type { border-top: none; padding-top: 0; }
      .variant-b .section-divider-strong { border-top: 1px solid #d4d4d4; margin-top: 6px; }
      .variant-b .stitle {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }
      .variant-b .stitle .bar {
        width: 3px; height: 16px; border-radius: 2px;
        background: #2563eb;
      }
      .variant-b .stitle h3 {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
      .variant-b .stitle .badge {
        margin-left: auto;
        background: #f3f4f6;
        color: var(--muted);
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 3px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .variant-b .role-content .bar { background: #2563eb; }
      .variant-b .role-action .bar { background: #000; height: 18px; }
      .variant-b .role-config .bar { background: #d97706; }
      .variant-b .role-meta .bar { background: #9ca3af; }
      .variant-b .stitle h3 small {
        font-size: 11px;
        font-weight: 500;
        color: var(--muted);
        margin-left: 6px;
      }
      .variant-b .seg-control {
        display: inline-flex;
        background: #f3f4f6;
        border-radius: 6px;
        padding: 2px;
        gap: 2px;
      }
      .variant-b .seg-control button {
        background: transparent;
        border: none;
        font-size: 12px;
        font-weight: 500;
        padding: 6px 14px;
        border-radius: 4px;
        cursor: pointer;
        color: var(--muted);
      }
      .variant-b .seg-control button.active {
        background: #fff;
        color: var(--text);
        box-shadow: 0 1px 2px rgba(0,0,0,0.08);
      }
      .variant-b .cta-preview-mini {
        margin-top: 10px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: var(--muted);
      }
      .variant-b .cta-preview-mini .btn {
        background: #000;
        color: #fff;
        font-weight: 600;
        font-size: 12px;
        padding: 7px 14px;
        border-radius: 3px;
      }
    `}</style>

    <h1 className="panel-title">Email Builder</h1>

    <div className="section role-meta" style={{ paddingTop: 0 }}>
      <div className="stitle">
        <span className="bar" />
        <h3>Template</h3>
      </div>
      <TemplateSelectMock />
    </div>

    <div className="section role-meta">
      <div className="stitle">
        <span className="bar" />
        <h3>Preheader</h3>
      </div>
      <PreheaderField />
    </div>

    <div className="section role-content">
      <div className="stitle">
        <span className="bar" />
        <h3>Body <small>above CTA</small></h3>
      </div>
      <RichEditorMock
        content={<><p style={{ margin: 0 }}>Hi <span style={{ background: '#fef3c7', padding: '0 2px' }}>{'{{Client.FirstName}}'}</span>, you may qualify for disability benefits. Click below to start your free review.</p></>}
      />
    </div>

    <div className="section role-action">
      <div className="stitle">
        <span className="bar" />
        <h3>Call to action</h3>
      </div>
      <label className="field-label">Button text</label>
      <input type="text" defaultValue="Check My Eligibility" style={{ marginBottom: 10 }} />

      <label className="field-label">Destination</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div className="seg-control">
          <button className="active">Phone</button>
          <button>URL variable</button>
        </div>
      </div>
      <input type="text" defaultValue="555-123-4567" />
      <div className="hint">Non-digits stripped for tel: link.</div>

      <div className="cta-preview-mini">
        <span>Renders as →</span>
        <span className="btn">Check My Eligibility</span>
      </div>
    </div>

    <div className="section role-content">
      <div className="stitle">
        <span className="bar" />
        <h3>Body <small>below CTA</small></h3>
        <span className="badge">optional</span>
      </div>
      <RichEditorMock placeholder="Optional." height={70} />
    </div>

    <div className="section role-config section-divider-strong" style={{ background: '#fafafa', margin: '10px -22px 0', padding: '18px 22px' }}>
      <div className="stitle">
        <span className="bar" />
        <h3>Test data</h3>
        <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>preview only</span>
      </div>
      <div className="hint" style={{ marginTop: 0, marginBottom: 8 }}>
        Substitutes <span className="mono">{'{{...}}'}</span> tokens in the live preview. Copied HTML is unaffected.
      </div>
      <TestDataJsonMock />
    </div>
  </div>
);

// ---------- Variant C: Tabs for Content / CTA / Test Data ----------
// Reorganizes the 4 segments into 3 top-level tabs. Less scrolling, focused
// editing. Body Above + Body Below become two stacked sub-sections inside Content.

const VariantC = () => {
  const [tab, setTab] = React.useState('content');

  return (
    <div className="panel-root variant-c">
      <style>{`
        .variant-c { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        .variant-c .head { padding: 18px 20px 0; }
        .variant-c .top-meta {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }
        .variant-c .top-meta label {
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          margin-bottom: 4px;
          display: block;
        }
        .variant-c .tabs {
          display: flex;
          gap: 2px;
          border-bottom: 1px solid var(--border);
          margin: 0 -20px;
          padding: 0 20px;
        }
        .variant-c .tab {
          background: transparent;
          border: none;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          color: var(--muted);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .variant-c .tab.active {
          color: var(--text);
          border-bottom-color: #2563eb;
          font-weight: 600;
        }
        .variant-c .tab .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #10b981;
          display: inline-block;
        }
        .variant-c .tab .pillct {
          background: #eef2ff;
          color: #2563eb;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 999px;
        }
        .variant-c .body { flex: 1; overflow-y: auto; padding: 18px 20px 24px; }
        .variant-c .sub {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 12px;
        }
        .variant-c .sub-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 13px;
          font-weight: 600;
        }
        .variant-c .sub-head .position {
          font-size: 10px;
          color: var(--muted);
          font-weight: 600;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .variant-c .seg-control {
          display: inline-flex;
          background: #f3f4f6;
          border-radius: 6px;
          padding: 2px;
          gap: 2px;
          width: 100%;
        }
        .variant-c .seg-control button {
          flex: 1;
          background: transparent;
          border: none;
          font-size: 12px;
          font-weight: 500;
          padding: 7px 10px;
          border-radius: 4px;
          cursor: pointer;
          color: var(--muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .variant-c .seg-control button.active {
          background: #fff;
          color: var(--text);
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
        .variant-c .stack-rail {
          position: relative;
          padding-left: 18px;
        }
        .variant-c .stack-rail::before {
          content: '';
          position: absolute;
          left: 5px;
          top: 12px;
          bottom: 12px;
          width: 2px;
          background: linear-gradient(to bottom, #e5e5e5 0, #e5e5e5 50%, transparent 50%);
          background-size: 100% 6px;
        }
        .variant-c .cta-preview-strip {
          margin-top: 12px;
          padding: 12px;
          border-radius: 6px;
          background: #fafafa;
          border: 1px dashed var(--border);
          text-align: center;
        }
        .variant-c .cta-preview-strip .btn {
          background: #000;
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          padding: 10px 22px;
          border-radius: 4px;
        }
        .variant-c .cta-preview-strip .meta {
          display: block;
          margin-top: 6px;
          font-size: 11px;
          color: var(--muted);
        }
      `}</style>

      <div className="head">
        <h1 className="panel-title" style={{ marginBottom: 12 }}>Email Builder</h1>

        <div className="top-meta">
          <div>
            <label>Template</label>
            <TemplateSelectMock />
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'content' ? 'active' : ''}`} onClick={() => setTab('content')}>
            Content <span className="pillct">2</span>
          </button>
          <button className={`tab ${tab === 'cta' ? 'active' : ''}`} onClick={() => setTab('cta')}>
            CTA <span className="dot" />
          </button>
          <button className={`tab ${tab === 'test' ? 'active' : ''}`} onClick={() => setTab('test')}>
            Test data
          </button>
        </div>
      </div>

      <div className="body">
        {tab === 'content' && (
          <div className="stack-rail">
            <div style={{ marginBottom: 14 }}>
              <label className="field-label" style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Preheader</label>
              <PreheaderField />
            </div>
            <div className="sub">
              <div className="sub-head">
                Body copy <span className="position">above CTA</span>
              </div>
              <RichEditorMock
                content={<><p style={{ margin: 0 }}>Hi <span style={{ background: '#fef3c7', padding: '0 2px' }}>{'{{Client.FirstName}}'}</span>, you may qualify for disability benefits. Click below to start your free review.</p></>}
              />
            </div>
            <div className="sub">
              <div className="sub-head">
                Body copy <span className="position">below CTA</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>optional</span>
              </div>
              <RichEditorMock placeholder="Optional follow-up copy after the button." height={60} />
            </div>
          </div>
        )}

        {tab === 'cta' && (
          <>
            <div className="sub">
              <label className="field-label">Button text</label>
              <input type="text" defaultValue="Check My Eligibility" style={{ marginBottom: 14 }} />

              <label className="field-label">Destination type</label>
              <div className="seg-control" style={{ marginBottom: 10 }}>
                <button className="active">📞 Phone</button>
                <button>🔗 URL variable</button>
              </div>

              <label className="field-label">Phone number</label>
              <input type="text" defaultValue="555-123-4567" />
              <div className="hint">Any format — non-digits stripped for tel: link.</div>

              <div className="cta-preview-strip">
                <span className="btn">Check My Eligibility</span>
                <span className="meta">→ tel:5551234567</span>
              </div>
            </div>
          </>
        )}

        {tab === 'test' && (
          <>
            <div className="note" style={{ marginBottom: 12 }}>
              <strong>Preview only.</strong> Substitutes <span className="mono">{'{{Client.FirstName}}'}</span> tokens in the live preview. Copied HTML keeps tokens intact for SendGrid.
            </div>
            <TestDataJsonMock />
            <div className="hint">Unresolved tokens stay visible in the preview so missing keys are obvious.</div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------- Variant B2: refined — no long rail, subtler section markers ----------
// Cards keep their containment but lose the colored left border. The numbered
// circle is replaced with a small uppercase eyebrow label (e.g. "01 — Content").
// CTA section uses a soft tinted background instead of a black rail.
// Test Data still sits in amber to signal "preview only".

const VariantB2 = () => (
  <div className="panel-root variant-b2">
    <style>{`
      .variant-b2 { padding: 20px; overflow-y: auto; }
      .variant-b2 .seg {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 10px;
      }
      .variant-b2 .seg-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 12px;
      }
      .variant-b2 .seg-eyebrow {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: var(--muted-2);
        font-variant-numeric: tabular-nums;
      }
      .variant-b2 .seg-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
      }
      .variant-b2 .seg-desc {
        font-size: 12px;
        color: var(--muted);
        margin-left: auto;
        font-weight: 500;
      }
      .variant-b2 .seg-cta {
        background: #f7f7f8;
        border-color: #e0e0e2;
      }
      .variant-b2 .seg-test {
        background: #fffaf0;
        border-color: #fde68a;
      }
      .variant-b2 .seg-test .seg-eyebrow { color: #b45309; }
      .variant-b2 .seg-meta {
        background: transparent;
        border: none;
        padding: 0;
        margin-bottom: 18px;
      }
      .variant-b2 .seg-meta .seg-head { margin-bottom: 8px; }
      /* segmented control — no colored icons */
      .variant-b2 .seg-control {
        display: inline-flex;
        background: #f3f4f6;
        border-radius: 6px;
        padding: 2px;
        gap: 2px;
        width: 100%;
      }
      .variant-b2 .seg-control button {
        flex: 1;
        background: transparent;
        border: none;
        font-size: 12px;
        font-weight: 500;
        padding: 7px 10px;
        border-radius: 4px;
        cursor: pointer;
        color: var(--muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .variant-b2 .seg-control button .ico {
        width: 13px; height: 13px;
        color: currentColor;
        opacity: 0.85;
      }
      .variant-b2 .seg-control button.active {
        background: #fff;
        color: var(--text);
        box-shadow: 0 1px 2px rgba(0,0,0,0.08);
      }
      .variant-b2 .cta-preview {
        margin-top: 12px;
        padding: 10px 12px;
        background: #fff;
        border-radius: 6px;
        border: 1px dashed var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .variant-b2 .cta-preview .btn {
        background: #000;
        color: #fff;
        font-weight: 600;
        font-size: 13px;
        padding: 10px 22px;
        border-radius: 4px;
      }
    `}</style>

    <h1 className="panel-title">Email Builder</h1>

    <div className="seg seg-meta">
      <label className="field-label">Template</label>
      <TemplateSelectMock />
      <label className="field-label" style={{ marginTop: 4 }}>Preheader</label>
      <PreheaderField />
    </div>

    <div className="seg">
      <div className="seg-head">
        <span className="seg-eyebrow">01</span>
        <span className="seg-title">Body — above CTA</span>
      </div>
      <RichEditorMock
        content={<><p style={{ margin: 0 }}>Hi <span style={{ background: '#fef3c7', padding: '0 2px' }}>{'{{Client.FirstName}}'}</span>, you may qualify for disability benefits. Click below to start your free review.</p></>}
      />
    </div>

    <div className="seg seg-cta">
      <div className="seg-head">
        <span className="seg-eyebrow">02</span>
        <span className="seg-title">Call to action</span>
      </div>
      <label className="field-label">Button text</label>
      <input type="text" defaultValue="Check My Eligibility" style={{ marginBottom: 10 }} />

      <label className="field-label">Destination</label>
      <div className="seg-control" style={{ marginBottom: 8 }}>
        <button className="active">
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>
          Phone
        </button>
        <button>
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          URL variable
        </button>
      </div>
      <input type="text" defaultValue="555-123-4567" />
      <div className="hint">Any format — non-digits stripped for tel: link.</div>

      <div className="cta-preview">
        <span className="btn">Check My Eligibility</span>
      </div>
    </div>

    <div className="seg">
      <div className="seg-head">
        <span className="seg-eyebrow">03</span>
        <span className="seg-title">Body — below CTA</span>
        <span className="seg-desc">optional</span>
      </div>
      <RichEditorMock placeholder="Optional." height={70} />
    </div>

    <div className="seg seg-test">
      <div className="seg-head">
        <span className="seg-eyebrow">PREVIEW</span>
        <span className="seg-title">Test data</span>
      </div>
      <div className="hint" style={{ marginBottom: 8, marginTop: 0 }}>
        Substitutes <span className="mono">{'{{Client.FirstName}}'}</span> tokens in the live preview. Copied HTML is unaffected.
      </div>
      <TestDataJsonMock />
    </div>
  </div>
);

// ---------- Variant B3: refined — no rail, no badge, just type hierarchy ----------
// Strips ornamentation entirely. Sections are cards with a strong title + thin
// inline tag for role. Test Data still gets a tinted card to set it apart.
// Cleaner, lets type do the work.

const VariantB3 = () => (
  <div className="panel-root variant-b3">
    <style>{`
      .variant-b3 { padding: 20px; overflow-y: auto; }
      .variant-b3 .seg {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 10px;
      }
      .variant-b3 .seg.seg-cta {
        background: #f7f7f8;
        border-color: #e0e0e2;
      }
      .variant-b3 .seg.seg-test {
        background: #fffaf0;
        border-color: #fde68a;
      }
      .variant-b3 .seg.seg-meta {
        background: transparent;
        border: none;
        padding: 0;
        margin-bottom: 18px;
      }
      .variant-b3 .seg-head {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
      }
      .variant-b3 .seg-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text);
        letter-spacing: -0.01em;
      }
      .variant-b3 .seg-tag {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--muted);
        background: #f3f4f6;
        padding: 2px 7px;
        border-radius: 3px;
      }
      .variant-b3 .seg-desc {
        font-size: 12px;
        color: var(--muted);
        margin-left: auto;
        font-weight: 500;
      }
      .variant-b3 .seg-test .seg-tag {
        background: #fef3c7;
        color: #b45309;
      }
      .variant-b3 .seg-control {
        display: inline-flex;
        background: #f3f4f6;
        border-radius: 6px;
        padding: 2px;
        gap: 2px;
        width: 100%;
      }
      .variant-b3 .seg-control button {
        flex: 1;
        background: transparent;
        border: none;
        font-size: 12px;
        font-weight: 500;
        padding: 7px 10px;
        border-radius: 4px;
        cursor: pointer;
        color: var(--muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .variant-b3 .seg-control button .ico {
        width: 13px; height: 13px;
        color: currentColor;
        opacity: 0.85;
      }
      .variant-b3 .seg-control button.active {
        background: #fff;
        color: var(--text);
        box-shadow: 0 1px 2px rgba(0,0,0,0.08);
      }
      .variant-b3 .cta-preview {
        margin-top: 12px;
        padding: 10px 12px;
        background: #fff;
        border-radius: 6px;
        border: 1px dashed var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .variant-b3 .cta-preview .btn {
        background: #000;
        color: #fff;
        font-weight: 600;
        font-size: 13px;
        padding: 10px 22px;
        border-radius: 4px;
      }
    `}</style>

    <h1 className="panel-title">Email Builder</h1>

    <div className="seg seg-meta">
      <label className="field-label">Template</label>
      <TemplateSelectMock />
      <label className="field-label" style={{ marginTop: 4 }}>Preheader</label>
      <PreheaderField />
    </div>

    <div className="seg">
      <div className="seg-head">
        <span className="seg-title">Body</span>
        <span className="seg-tag">above CTA</span>
      </div>
      <RichEditorMock
        content={<><p style={{ margin: 0 }}>Hi <span style={{ background: '#fef3c7', padding: '0 2px' }}>{'{{Client.FirstName}}'}</span>, you may qualify for disability benefits. Click below to start your free review.</p></>}
      />
    </div>

    <div className="seg seg-cta">
      <div className="seg-head">
        <span className="seg-title">Call to action</span>
      </div>
      <label className="field-label">Button text</label>
      <input type="text" defaultValue="Check My Eligibility" style={{ marginBottom: 10 }} />

      <label className="field-label">Destination</label>
      <div className="seg-control" style={{ marginBottom: 8 }}>
        <button className="active">
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>
          Phone
        </button>
        <button>
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          URL variable
        </button>
      </div>
      <input type="text" defaultValue="555-123-4567" />
      <div className="hint">Any format — non-digits stripped for tel: link.</div>

      <div className="cta-preview">
        <span className="btn">Check My Eligibility</span>
      </div>
    </div>

    <div className="seg">
      <div className="seg-head">
        <span className="seg-title">Body</span>
        <span className="seg-tag">below CTA</span>
        <span className="seg-desc">optional</span>
      </div>
      <RichEditorMock placeholder="Optional." height={70} />
    </div>

    <div className="seg seg-test">
      <div className="seg-head">
        <span className="seg-title">Test data</span>
        <span className="seg-tag">preview only</span>
      </div>
      <div className="hint" style={{ marginBottom: 8, marginTop: 0 }}>
        Substitutes <span className="mono">{'{{Client.FirstName}}'}</span> tokens in the live preview. Copied HTML is unaffected.
      </div>
      <TestDataJsonMock />
    </div>
  </div>
);

window.VariantA = VariantA;
window.VariantB = VariantB;
window.VariantC = VariantC;
window.VariantB2 = VariantB2;
window.VariantB3 = VariantB3;
