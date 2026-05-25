"use client";

import { Plus, X } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export interface PollDraft {
  question: string;
  options: string[];
  multiSelect: boolean;
  closesAt: string;
}

export const emptyPollDraft: PollDraft = {
  question: "",
  options: ["", ""],
  multiSelect: false,
  closesAt: "",
};

interface PollBuilderProps {
  value: PollDraft;
  onChange: (next: PollDraft) => void;
}

export function PollBuilder({ value, onChange }: PollBuilderProps) {
  const { t } = useT();

  function setOption(index: number, label: string) {
    onChange({
      ...value,
      options: value.options.map((o, i) => (i === index ? label : o)),
    });
  }

  function addOption() {
    onChange({ ...value, options: [...value.options, ""] });
  }

  function removeOption(index: number) {
    onChange({
      ...value,
      options: value.options.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
      <div className="space-y-1.5">
        <Label>{t("poll.question")}</Label>
        <Input
          value={value.question}
          placeholder={t("poll.questionPlaceholder")}
          onChange={(e) => onChange({ ...value, question: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("poll.option")}</Label>
        {value.options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={option}
              placeholder={`${t("poll.option")} ${index + 1}`}
              onChange={(e) => setOption(index, e.target.value)}
            />
            {value.options.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("poll.removeOption")}
                onClick={() => removeOption(index)}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="size-4" />
          {t("poll.addOption")}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="poll-multi">{t("poll.multiSelect")}</Label>
        <Switch
          id="poll-multi"
          checked={value.multiSelect}
          onCheckedChange={(checked) =>
            onChange({ ...value, multiSelect: checked })
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="poll-closes">{t("poll.closesAt")}</Label>
        <Input
          id="poll-closes"
          type="date"
          value={value.closesAt}
          onChange={(e) => onChange({ ...value, closesAt: e.target.value })}
        />
      </div>
    </div>
  );
}
