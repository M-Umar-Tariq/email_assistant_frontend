"use client"

import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

let scrollTriggerRegistered = false

/** Register ScrollTrigger once on the client (required for scroll-driven tweens). */
export function registerScrollTrigger() {
  if (typeof window === "undefined" || scrollTriggerRegistered) return
  gsap.registerPlugin(ScrollTrigger)
  scrollTriggerRegistered = true
}

export { gsap, ScrollTrigger }
