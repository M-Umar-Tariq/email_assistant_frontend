/** Shared helpers for AI agent / assistant action → inbox UI updates. */

export type EmailActionExecutedDetail = {
  type: string
  mailboxId?: string
  marked?: number
  emailIds?: string[]
  scope?: string
}

type EmailRow = {
  id: string
  mailbox?: string
  read?: boolean
  starred?: boolean
}

function inMailboxScope(
  email: EmailRow,
  filterMailbox: string,
  mailboxId?: string,
): boolean {
  if (mailboxId && email.mailbox !== mailboxId) return false
  if (filterMailbox !== "all" && email.mailbox !== filterMailbox) return false
  return true
}

/** Apply a completed agent action to the visible inbox list (after API success only). */
export function applyAgentActionToList<T extends EmailRow>(
  list: T[],
  detail: EmailActionExecutedDetail,
  folder: string,
  filterMailbox: string,
): T[] {
  const { type, mailboxId, emailIds, scope } = detail
  const idSet = emailIds?.length ? new Set(emailIds) : null

  const patchByIds = (patch: Partial<T>) =>
    list.map((e) => (idSet?.has(e.id) ? { ...e, ...patch } : e))

  const patchByScope = (match: (e: T) => boolean, patch: Partial<T>) =>
    list.map((e) =>
      inMailboxScope(e, filterMailbox, mailboxId) && match(e) ? { ...e, ...patch } : e,
    )

  const removeByIds = () =>
    idSet ? list.filter((e) => !idSet.has(e.id)) : list

  const removeByScope = (match: (e: T) => boolean) =>
    list.filter(
      (e) => !(inMailboxScope(e, filterMailbox, mailboxId) && match(e)),
    )

  switch (type) {
    case "mark_all_read":
      return patchByScope((e) => !e.read, { read: true } as Partial<T>)
    case "mark_all_unread":
      return patchByScope((e) => !!e.read, { read: false } as Partial<T>)
    case "mark_read":
      if (idSet) return patchByIds({ read: true } as Partial<T>)
      if (scope === "all_unread_inbox") {
        return patchByScope((e) => !e.read, { read: true } as Partial<T>)
      }
      return list
    case "mark_unread":
      if (idSet) return patchByIds({ read: false } as Partial<T>)
      if (scope === "all_read_inbox") {
        return patchByScope((e) => !!e.read, { read: false } as Partial<T>)
      }
      return list
    case "star_email":
    case "mark_starred":
    case "mark_all_starred":
      if (idSet) return patchByIds({ starred: true } as Partial<T>)
      if (scope === "all_inbox") {
        return patchByScope(() => true, { starred: true } as Partial<T>)
      }
      return list
    case "unstar_email":
    case "mark_unstarred":
    case "mark_all_unstarred":
      if (idSet) return patchByIds({ starred: false } as Partial<T>)
      if (scope === "all_starred_inbox") {
        return patchByScope((e) => !!e.starred, { starred: false } as Partial<T>)
      }
      if (folder === "starred") return removeByScope((e) => !!e.starred)
      return list
    case "trash_email":
    case "delete_email":
    case "move_to_trash":
      if (idSet) return removeByIds()
      return list
    case "archive_email":
      if (folder === "inbox" && idSet) return removeByIds()
      return list
    case "snooze_email":
      if (idSet) return removeByIds()
      return list
    default:
      return list
  }
}

export function buildActionExecutedDetail(
  action: { type: string; mailbox_id?: string; email_id?: string; email_ids?: string[] },
  result: {
    marked?: number
    email_ids?: string[]
    scope?: string
  },
): EmailActionExecutedDetail {
  const emailIds =
    result.email_ids ??
    (action.email_ids?.length ? action.email_ids : undefined) ??
    (action.email_id ? [action.email_id] : undefined)

  return {
    type: action.type,
    mailboxId: action.mailbox_id,
    marked: result.marked,
    emailIds,
    scope: result.scope,
  }
}

export function dispatchEmailActionExecuted(detail: EmailActionExecutedDetail): void {
  window.dispatchEvent(
    new CustomEvent("email:action-executed", { detail }),
  )
  window.dispatchEvent(new CustomEvent("folder-counts:refresh"))
}

/** How long to skip full inbox refetch after an agent action (ms). @deprecated grace removed — sync always refetches. */
export const ACTION_UI_GRACE_MS = 0
