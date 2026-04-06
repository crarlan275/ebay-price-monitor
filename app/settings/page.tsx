'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, Clock, ArrowsClockwise, TelegramLogo } from '@phosphor-icons/react';

const defaultSettings = {
  checkIntervalMinutes: 60,
  dailySummaryEnabled:  false,
  dailySummaryHour:     8,
  telegramBotToken:     '',
  telegramChatId:       '',
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
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-1)]">Ajustes</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Preferencias del monitor</p>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-in">
            <CheckCircle size={13} weight="fill" />
            Cambios guardados
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Telegram */}
        <Section title="Telegram" Icon={TelegramLogo}>
          <Field label="Bot Token" htmlFor="tgToken">
            <input
              id="tgToken" type="password" value={form.telegramBotToken}
              onChange={e => setForm(f => ({ ...f, telegramBotToken: e.target.value }))}
              placeholder="1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxx"
              className={inputCls}
            />
          </Field>
          <Field label="Chat ID" htmlFor="tgChat">
            <input
              id="tgChat" value={form.telegramChatId}
              onChange={e => setForm(f => ({ ...f, telegramChatId: e.target.value }))}
              placeholder="754717512"
              className={inputCls}
            />
          </Field>
          <p className="text-xs text-[var(--text-3)]">
            Las credenciales activas están en <code className="bg-zinc-100 px-1 rounded">.env.local</code> — estos campos son para referencia o futura actualización.
          </p>
        </Section>

        {/* Monitoreo */}
        <Section title="Monitoreo" Icon={ArrowsClockwise}>
          <Field label="Intervalo de búsqueda (minutos)" htmlFor="interval">
            <input
              id="interval" type="number" min="30" max="1440"
              value={form.checkIntervalMinutes}
              onChange={e => setForm(f => ({ ...f, checkIntervalMinutes: Math.max(30, parseInt(e.target.value) || 30) }))}
              className={inputCls}
            />
            <p className="text-xs text-[var(--text-3)] mt-1">
              Mínimo 30 minutos · Máximo 1440 min (24 horas)
            </p>
          </Field>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, dailySummaryEnabled: !f.dailySummaryEnabled }))}
              className={[
                'relative w-9 h-5 rounded-full transition-spring cursor-pointer',
                form.dailySummaryEnabled ? 'bg-emerald-500' : 'bg-zinc-300',
              ].join(' ')}
            >
              <span className={[
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-spring',
                form.dailySummaryEnabled ? 'left-4' : 'left-0.5',
              ].join(' ')} />
            </div>
            <span className="text-sm text-[var(--text-2)]">Enviar resumen diario por Telegram</span>
          </label>

          {form.dailySummaryEnabled && (
            <Field label="Hora del resumen (0–23)" htmlFor="summaryHour">
              <input
                id="summaryHour" type="number" min="0" max="23" value={form.dailySummaryHour}
                onChange={e => setForm(f => ({ ...f, dailySummaryHour: parseInt(e.target.value) }))}
                className={inputCls}
              />
            </Field>
          )}
        </Section>

        <button
          type="submit" disabled={saving}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-spring active:scale-[0.98] shadow-sm"
        >
          <Clock size={15} weight="bold" />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}

const inputCls = [
  'w-full px-3.5 py-2.5 bg-zinc-50 border border-[var(--border)] rounded-xl text-sm',
  'text-[var(--text-1)] placeholder:text-[var(--text-3)]',
  'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
  'transition-spring',
].join(' ');

function Section({ title, Icon, children }: { title: string; Icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-card">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
        <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center">
          <Icon size={14} weight="duotone" className="text-zinc-500" />
        </div>
        <h2 className="text-sm font-semibold text-[var(--text-1)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-[var(--text-2)]">{label}</label>
      {children}
    </div>
  );
}
