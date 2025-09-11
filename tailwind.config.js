/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs", // ✅ Watch all EJS templates
    "./public/**/*.js", // Optional: if JS generates HTML
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};


