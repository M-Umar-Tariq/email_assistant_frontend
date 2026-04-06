/** Session flag: show one-time welcome after registration (cleared on dismiss or tab close). */
export const FRESH_SIGNUP_KEY = "smartmailai_fresh_signup"

export function markFreshSignup() {
  try {
    if (typeof window !== "undefined") sessionStorage.setItem(FRESH_SIGNUP_KEY, "1")
  } catch {
    // ignore
  }
}
