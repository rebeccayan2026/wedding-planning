import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Headings only. Body text stays on the system stack, which renders
        // Chinese and Latin consistently — a Latin display face sitting next
        // to PingFang SC at body size looks mismatched.
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        // Eucalyptus. Used sparingly — the mark, the calm state, focus rings.
        // Chosen over a corporate blue because this shouldn't read as
        // enterprise software.
        sage: {
          50: "#F3F6F2",
          100: "#E4EAE2",
          200: "#CBD8C8",
          500: "#6B8570",
          700: "#556E59",
        },
        // Urgency, hand-mixed rather than framework-default. Tailwind's stock
        // red and amber read as "system alert"; these read as pigment.
        clay: {
          50: "#FCF1ED",
          100: "#F6DDD4",
          700: "#A8452F",
        },
        ochre: {
          50: "#FAF5E9",
          100: "#F1E5C9",
          700: "#86672C",
        },
      },
      boxShadow: {
        // Barely-there lift for the cards that need attention — enough to
        // separate them from the page without looking like a bubble.
        card: "0 1px 2px rgba(41, 37, 36, 0.04), 0 1px 1px rgba(41, 37, 36, 0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
