import { Lock, Trash2, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LegalSection } from "@/lib/legalTemplates";

/**
 * Editor for a single legal document (terms or privacy). Lets a non-technical
 * merchant edit section text, add/remove sections and reorder them. The locked
 * disclaimer section can't be edited or removed.
 */
interface LegalDocEditorProps {
  sections: LegalSection[];
  onChange: (sections: LegalSection[]) => void;
}

const LegalDocEditor = ({ sections, onChange }: LegalDocEditorProps) => {
  const update = (id: string, patch: Partial<LegalSection>) =>
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const remove = (id: string) => onChange(sections.filter((s) => s.id !== id));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    if (sections[index].locked || sections[target].locked) return; // keep disclaimer pinned
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = () => {
    const id = `section-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
    onChange([...sections, { id, heading: "סעיף חדש", body: "" }]);
  };

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <div
          key={section.id}
          className={`rounded-xl border p-4 ${
            section.locked ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"
          }`}
        >
          {section.locked ? (
            <>
              <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-semibold">{section.heading} (חובה — לא ניתן למחוק)</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={section.heading}
                  onChange={(e) => update(section.id, { heading: e.target.value })}
                  className="h-10 font-semibold"
                  placeholder="כותרת הסעיף"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(index, -1)} title="העבר למעלה">
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(index, 1)} title="העבר למטה">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(section.id)} title="מחק סעיף">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <textarea
                value={section.body}
                onChange={(e) => update(section.id, { body: e.target.value })}
                rows={4}
                placeholder="תוכן הסעיף..."
                className="w-full rounded-lg bg-background border border-border p-3 text-sm leading-relaxed focus:border-primary focus:outline-none resize-y"
              />
            </>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" onClick={add} className="w-full gap-2 border-dashed">
        <Plus className="w-4 h-4" />
        הוספת סעיף
      </Button>
    </div>
  );
};

export default LegalDocEditor;
