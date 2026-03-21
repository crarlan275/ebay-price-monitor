'use client';
// ============================================================
// app/settings/page.tsx — Configuración del usuario
// ============================================================
// PENDIENTE DISEÑO: colores de formulario de ajustes
// ============================================================
import { useEffect, useState } from 'react';

const defaultSettings = {
  ebayClientId:          '',
  ebayClientSecret:      '',
  ebayMarketplace:       'EBAY_US',
  callmebotPhone:        '',
  callmebotApikey:       '',
  checkIntervalMinutes:  30,
  dailySummaryEnabled:   false,
  dailySummaryHour:      8,
};

export default function SettingsPage() {
  const [form, setForm]     = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    fetch('/api/products?settings=1')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setForm(prev => ({ ...prev, ...data })); });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/products?settings=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* PENDIENTE DISEÑO: tipografía de título */}
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* eBay API */}
        {/* PENDIENTE DISEÑO: sección con borde y fondo */}
        <Section title="eBay API">
          <Field label="Client ID" htmlFor="eClientId">
            <input id="eClientId" type="password" value={form.ebayClientId}
              onChange={e => setForm(f => ({ ...f, ebayClientId: e.target.value }))}
              placeholder="Tu eBay Client ID" className={inputCls} />
          </Field>
          <Field label="Client Secret" htmlFor="eClientSecret">
            <input id="eClientSecret" type="password" value={form.ebayClientSecret}
              onChange={e => setForm(f => ({ ...f, ebayClientSecret: e.target.value }))}
              placeholder="Tu eBay Client Secret" className={inputCls} />
          </Field>
          <Field label="Marketplace" htmlFor="eMarket">
            <select id="eMarket" value={form.ebayMarketplace}
              onChange={e => setForm(f => ({ ...f, ebayMarketplace: e.target.value }))} className={inputCls}>
              <option value="EBAY_US">eBay US</option>
              <option value="EBAY_ES">eBay ES</option>
              <option value="EBAY_DE">eBay DE</option>
              <option value="EBAY_UK">eBay UK</option>
            </select>
          </Field>
        </Section>

        {/* Callmebot */}
        <Section title="WhatsApp (Callmebot)">
          <Field label="Número de teléfono" htmlFor="cbPhone">
            <input id="cbPhone" type="tel" value={form.callmebotPhone}
              onChange={e => setForm(f => ({ ...f, callmebotPhone: e.target.value }))}
              placeholder="+1234567890" className={inputCls} />
          </Field>
          <Field label="API Key" htmlFor="cbKey">
            <input id="cbKey" type="password" value={form.callmebotApikey}
              onChange={e => setForm(f => ({ ...f, callmebotApikey: e.target.value }))}
              placeholder="Tu Callmebot API Key" className={inputCls} />
          </Field>
        </Section>

        {/* Monitoreo */}
        <Section title="Monitoreo">
          <Field label="Intervalo de verificación (minutos)" htmlFor="interval">
            <input id="interval" type="number" min="5" max="1440" value={form.checkIntervalMinutes}
              onChange={e => setForm(f => ({ ...f, checkIntervalMinutes: parseInt(e.target.value) }))}
              className={inputCls} />
          </Field>
          <div className="flex items-center gap-3">
            <input id="summary" type="checkbox" checked={form.dailySummaryEnabled}
              onChange={e => setForm(f => ({ ...f, dailySummaryEnabled: e.target.checked }))}
              className="h-4 w-4 text-primary-600 rounded" />
            <label htmlFor="summary" className="text-sm text-gray-700">Enviar resumen diario por WhatsApp</label>
          </div>
          {form.dailySummaryEnabled && (
            <Field label="Hora del resumen (0–23)" htmlFor="summaryHour">
              <input id="summaryHour" type="number" min="0" max="23" value={form.dailySummaryHour}
                onChange={e => setForm(f => ({ ...f, dailySummaryHour: parseInt(e.target.value) }))}
                className={inputCls} />
            </Field>
          )}
        </Section>

        <div className="flex items-center gap-4">
          {/* PENDIENTE DISEÑO: color de botón guardar */}
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {/* PENDIENTE DISEÑO: color de confirmación guardado */}
          {saved && <span className="text-sm text-green-600 font-medium">✓ Cambios guardados</span>}
        </div>
      </form>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    /* PENDIENTE DISEÑO: sección con fondo y borde */
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      {/* PENDIENTE DISEÑO: color del título de sección */}
      <h2 className="text-base font-semibold text-gray-700 border-b border-gray-100 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
