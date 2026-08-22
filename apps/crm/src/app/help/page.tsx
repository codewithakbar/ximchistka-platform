'use client';

import { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Info,
  Lightbulb,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { useClientRole } from '@/hooks/use-client-auth';
import { useI18n } from '@/lib/i18n';
import { HELP_CONTENT, type HelpBlock, type HelpSection } from '@/lib/help-content';
import { ROLE_LABELS } from '@/lib/roles';

/** Bo'lim ichidagi bitta blokni chizadi */
function Block({ block }: { block: HelpBlock }) {
  switch (block.kind) {
    case 'p':
      return <p className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>;

    case 'steps':
      return (
        <ol className="space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      );

    case 'tip':
      return (
        <div className="flex gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
          <Lightbulb className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <p className="text-sm leading-relaxed">{block.text}</p>
        </div>
      );

    case 'warn':
      return (
        <div className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-sm leading-relaxed">{block.text}</p>
        </div>
      );

    case 'table':
      return (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-3 py-2 text-left font-semibold">{block.head[0]}</th>
                <th className="px-3 py-2 text-left font-semibold">{block.head[1]}</th>
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 align-top font-medium whitespace-nowrap">{row[0]}</td>
                  <td className="px-3 py-2 align-top leading-relaxed text-muted-foreground">
                    {row[1]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Yig'iladigan bo'lim */
function Section({ section, defaultOpen }: { section: HelpSection; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/40 transition-colors rounded-xl"
      >
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold leading-tight">{section.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{section.summary}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <CardContent className="space-y-4 border-t border-border p-4">
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

/** Bo'lim matnini qidiruv uchun bitta satrga yig'adi */
function sectionText(section: HelpSection): string {
  const parts: string[] = [section.title, section.summary];
  for (const b of section.blocks) {
    if (b.kind === 'p' || b.kind === 'tip' || b.kind === 'warn') parts.push(b.text);
    else if (b.kind === 'steps') parts.push(...b.items);
    else if (b.kind === 'table') {
      parts.push(...b.head);
      for (const row of b.rows) parts.push(row[0], row[1]);
    }
  }
  return parts.join(' ').toLowerCase();
}

export default function HelpPage() {
  const { locale } = useI18n();
  const role = useClientRole();
  const [query, setQuery] = useState('');

  const content = HELP_CONTENT[locale];

  // Rolga tegishli bo'limlar. Rol hali o'qilmagan bo'lsa hammasini ko'rsatamiz —
  // bu localStorage dan keladi va faqat mount dan keyin ma'lum bo'ladi.
  const visible = useMemo(
    () => (role ? content.sections.filter((s) => s.roles.includes(role)) : content.sections),
    [content.sections, role],
  );

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () => (q ? visible.filter((s) => sectionText(s).includes(q)) : visible),
    [visible, q],
  );

  return (
    <AppShell title={content.pageTitle}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-4">
          <BookOpen className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm leading-relaxed">{content.pageLead}</p>
            {role && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{content.forRole}:</span>
                <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={content.searchPlaceholder}
            className="pl-9"
          />
        </div>

        {results.length === 0 ? (
          <Empty icon={Info} title={content.noResults} />
        ) : (
          <div className="space-y-2.5">
            {results.map((section) => (
              <Section
                // Qidiruv holati o'zgarganda qayta yaratiladi, shunda topilgan
                // bo'limlar ochiq holda chiqadi
                key={`${section.id}:${q ? 'found' : 'idle'}`}
                section={section}
                defaultOpen={q ? true : section.id === visible[0]?.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
