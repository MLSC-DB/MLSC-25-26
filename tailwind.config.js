/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs", // ✅ Watch all EJS templates
    "./public/**/*.js", // Optional: if JS generates HTML
    "./public/**/*.html", // Any HTML files
  ],
  theme: {
    extend: {
      backgroundImage: {
        "main-bg": "url('/images/bg.jpg')",
      },
      backgroundSize: {
        "auto-650": "auto 650px",
        "auto-1300": "auto 1300px",
      },
    },
  },
  plugins: [],
  // Enable all JIT features for arbitrary values
  safelist: [
    "bg-[url(/images/bg.jpg)]",
    "bg-[auto_650px]",
    "sm:bg-[auto_1300px]",
    // Add other arbitrary values you use
  ],
};
