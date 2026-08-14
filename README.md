# 💧 Water Lab

Water Lab is an interactive web-based hydraulic simulation tool powered by EPANET. It allows you to draw water networks, configure junctions, reservoirs, tanks, and pipes, and simulate hydraulic behavior directly in the browser!

## 🚀 Live Demo

You can try out Water Lab live on GitHub Pages:
**👉 [https://bmushtaq65-eng.github.io/waterlab/](https://bmushtaq65-eng.github.io/waterlab/)**

## 🛠️ Features

* **Interactive Canvas**: Visually draw your water network using an intuitive point-and-click interface.
* **Property Panel**: Edit properties for junctions (demand, elevation), reservoirs (head), and pipes (diameter, length, roughness).
* **Live EPANET Simulation**: Run hydraulic simulations directly in the browser using the EPANET WebAssembly engine (`epanet-js`).
* **Visual Results**: View pressure at junctions and flow velocity in pipes mapped directly onto the canvas.
* **Data Tables**: View and edit network data in tabular form, and export results to Excel.

## 💻 Running Locally

To run Water Lab on your local machine, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bmushtaq65-eng/waterlab.git
   cd waterlab
   ```

2. **Install dependencies:**
   Make sure you have Node.js installed, then run:
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173` to view the app!

## 📦 Deployment

This project uses `gh-pages` to deploy to GitHub Pages. To build and deploy the app:

```bash
npm run build
npx gh-pages -d dist
```
*(Make sure GitHub Pages is configured to serve from the `gh-pages` branch).*
