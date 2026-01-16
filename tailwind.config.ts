import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Dark Professional Theme - Primary Colors
        'bg-primary': '#0F0F0F',
        'bg-secondary': '#1A1A1A',
        'bg-tertiary': '#242424',
        'txt-primary': '#FFFFFF',
        'txt-secondary': '#B3B3B3',
        'txt-tertiary': '#808080',
        'accent-primary': '#D32F2F',
        'accent-secondary': '#FF5722',
        'accent-success': '#4CAF50',
        'border-default': '#333333',
        'border-light': '#404040',
        
        // Legacy support (keep for gradual migration)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'professional': '8px',
        'sharp': '0px',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'Roboto', 'sans-serif'],
        sans: ['Montserrat', "var(--font-oswald)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      fontSize: {
        'h1': ['32px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '0.5px' }],
        'h2': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'small': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        'metric': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.4)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
} satisfies Config;
