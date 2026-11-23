// SHEEGOW ACADEMY — badge metadata
//
// Single source of truth for the badges students can earn. Each entry pairs a
// stable `type` (stored on the Badge row) with the title, description, lucide
// icon, and tailwind colour classes used to render the badge consistently in
// the dashboard widget and the leaderboard. `howToEarn` is the friendly hint
// shown in the tooltip so students know exactly what to do next.

import {
  Award,
  BookOpen,
  Flame,
  GraduationCap,
  Languages,
  Moon,
  Sparkles,
  Sun,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type BadgeType =
  | "first_lesson"
  | "first_course"
  | "streak_7"
  | "streak_30"
  | "quiz_master"
  | "social_butterfly"
  | "early_bird"
  | "night_owl"
  | "polyglot"
  | "perfect_attendance";

export interface BadgeMetadata {
  type: BadgeType;
  title: string;
  description: string;
  /** Short, action-oriented hint shown in the badge tooltip. */
  howToEarn: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon + chip background when earned. */
  color: string;
  /** Tailwind classes for the icon container when earned (bg + text). */
  iconBg: string;
}

export const BADGE_METADATA: BadgeMetadata[] = [
  {
    type: "first_lesson",
    title: "First Lesson",
    description: "You completed your very first lesson at SHEEGOW ACADEMY.",
    howToEarn: "Complete any lesson.",
    icon: BookOpen,
    color: "border-indigo-200 bg-indigo-50 text-indigo-700",
    iconBg: "bg-indigo-100 text-indigo-600",
  },
  {
    type: "first_course",
    title: "First Course",
    description: "You finished an entire course from start to end.",
    howToEarn: "Reach 100% progress in any enrolled course.",
    icon: GraduationCap,
    color: "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    type: "streak_7",
    title: "7-Day Streak",
    description: "Seven days of learning in a row. Keep the fire going!",
    howToEarn: "Be active 7 consecutive days.",
    icon: Flame,
    color: "border-orange-200 bg-orange-50 text-orange-700",
    iconBg: "bg-orange-100 text-orange-600",
  },
  {
    type: "streak_30",
    title: "30-Day Streak",
    description: "A full month of daily learning. Outstanding commitment.",
    howToEarn: "Be active 30 consecutive days.",
    icon: Trophy,
    color: "border-amber-300 bg-amber-50 text-amber-800",
    iconBg: "bg-amber-100 text-amber-600",
  },
  {
    type: "quiz_master",
    title: "Quiz Master",
    description: "You passed 5 quizzes. Your knowledge is sharp.",
    howToEarn: "Pass 5 quizzes.",
    icon: Target,
    color: "border-rose-200 bg-rose-50 text-rose-700",
    iconBg: "bg-rose-100 text-rose-600",
  },
  {
    type: "social_butterfly",
    title: "Social Butterfly",
    description: "You posted 10 discussion threads. Great community spirit!",
    howToEarn: "Start 10 discussion threads.",
    icon: Sparkles,
    color: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    iconBg: "bg-fuchsia-100 text-fuchsia-600",
  },
  {
    type: "early_bird",
    title: "Early Bird",
    description: "You joined a live class before 9 AM. The worm is yours.",
    howToEarn: "Attend a live class that starts before 9 AM.",
    icon: Sun,
    color: "border-yellow-200 bg-yellow-50 text-yellow-700",
    iconBg: "bg-yellow-100 text-yellow-600",
  },
  {
    type: "night_owl",
    title: "Night Owl",
    description: "You attended a live class after 9 PM. Burning the midnight oil!",
    howToEarn: "Attend a live class that starts after 9 PM.",
    icon: Moon,
    color: "border-violet-200 bg-violet-50 text-violet-700",
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    type: "polyglot",
    title: "Polyglot",
    description: "You completed courses across 3+ different levels.",
    howToEarn: "Complete courses in 3 or more levels.",
    icon: Languages,
    color: "border-cyan-200 bg-cyan-50 text-cyan-700",
    iconBg: "bg-cyan-100 text-cyan-600",
  },
  {
    type: "perfect_attendance",
    title: "Perfect Attendance",
    description: "You attended every live class in a course. Flawless.",
    howToEarn: "Attend every live class in a single course.",
    icon: Award,
    color: "border-teal-200 bg-teal-50 text-teal-700",
    iconBg: "bg-teal-100 text-teal-600",
  },
];

export const BADGE_MAP: Record<BadgeType, BadgeMetadata> = BADGE_METADATA.reduce(
  (acc, meta) => {
    acc[meta.type] = meta;
    return acc;
  },
  {} as Record<BadgeType, BadgeMetadata>
);

/** Look up metadata by raw string; returns undefined for unknown types. */
export function getBadgeMetadata(type: string): BadgeMetadata | undefined {
  return BADGE_MAP[type as BadgeType];
}
