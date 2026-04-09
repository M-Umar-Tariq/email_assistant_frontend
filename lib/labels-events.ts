import type { AiLabelRule } from "@/lib/api"

export const LABELS_UPDATED_EVENT = "labels:updated" as const

export type LabelsUpdatedDetail = { rules: AiLabelRule[] }

/** Call after saving label rules so the sidebar (and any other listeners) stay in sync. */
export function dispatchLabelsUpdated(rules: AiLabelRule[]) {
  if (typeof window === "undefined") return
  const filtered = rules.filter((r) => r.name?.trim())
  window.dispatchEvent(
    new CustomEvent<LabelsUpdatedDetail>(LABELS_UPDATED_EVENT, {
      detail: { rules: filtered },
    }),
  )
}
