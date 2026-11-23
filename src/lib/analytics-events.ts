/** Allow-listed conversion event names shared by the client helper and API. */
export const CONVERSION_EVENTS = [
  "hero_explore_courses",
  "hero_how_it_works",
  "pathway_courses",
  "pathway_kids",
  "pathway_business",
  "trial_enquiry",
  "checkout_start",
] as const;

export type ConversionEvent = (typeof CONVERSION_EVENTS)[number];
