/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:          '#07071a',
          bgSecondary: '#0d0d26',
          panel:       '#0f0f2a',
          panelLight:  '#14143a',
          border:      '#1e1e4a',
          borderLight: '#2a2a6a',
          accent:      '#7c5cfc',
          accentHover: '#9b7ffe',
          accentDark:  '#5a3de8',
          text:        '#e8e6ff',
          textMuted:   '#a8a4cc',
          muted:       '#6060a0',
          danger:      '#ff4466',
          dangerDark:  '#cc2244',
          success:     '#44ff99',
          successDark: '#22cc66',
          gold:        '#ffd700',
          goldDark:    '#cc9900',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        body:    ['"Noto Sans KR"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backgroundImage: {
        'gradient-radial':   'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':    'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-glow':         'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,92,252,0.3) 0%, transparent 70%)',
        'card-shine':        'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)',
      },
      boxShadow: {
        'glow-accent':  '0 0 20px rgba(124,92,252,0.4)',
        'glow-danger':  '0 0 20px rgba(255,68,102,0.4)',
        'glow-success': '0 0 20px rgba(68,255,153,0.3)',
        'panel':        '0 4px 32px rgba(0,0,0,0.5)',
        'card':         '0 2px 16px rgba(0,0,0,0.4)',
        'inset-glow':   'inset 0 0 20px rgba(124,92,252,0.1)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease-out',
        'slide-up':      'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':      'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'glow-pulse':    'glowPulse 2s ease-in-out infinite',
        'float':         'float 3s ease-in-out infinite',
        'spin-slow':     'spin 8s linear infinite',
        'text-flicker':  'textFlicker 0.15s ease-in-out 3',
      },
    },
  },
  plugins: [],
}
