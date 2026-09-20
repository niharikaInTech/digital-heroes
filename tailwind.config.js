/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a18',    // page background
        forest: '#1b2c2c', // panels
        sage: '#6b9e78',   // primary action / charity
        copper: '#b07a45', // prizes / highlights
        cream: '#f4efe6',  // text
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
