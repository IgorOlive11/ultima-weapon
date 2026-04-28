/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon:       '#39FF14',
        'neon-dim': '#1a7a08',
        'neon-bg':  'rgba(57,255,20,0.06)',
        bg:         '#080808',
        s1:         '#0f0f0f',
        s2:         '#161616',
        s3:         '#1e1e1e',
        border1:    '#222222',
        border2:    '#2a2a2a',
        ink:        '#e8e8e8',
        muted:      '#555555',
        muted2:     '#777777',
        danger:     '#ff2d2d',
        warn:       '#ffaa00',
        orange:     '#ff6600',
        yellow:     '#ffdd00',
        blue:       '#00aaff',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        mono:    ['"Share Tech Mono"', 'monospace'],
        body:    ['"Barlow Condensed"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
