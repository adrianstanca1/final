<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1bxBJgk2nuKF5tvtdT-YfJQL4PdtvzUvq

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy the `.env.local` file and add your Gemini API key from [AI Studio](https://aistudio.google.com/app/apikey)
   - The map functionality uses OpenStreetMap and works offline-capable

3. Run the app:
   ```bash
   npm run dev
   ```

## Key Features

🗺️ **Interactive Maps** - Full Leaflet integration with project locations and geofencing  
🤖 **AI-Powered Tools** - Project management advisor, cost estimation, risk analysis  
📍 **Location Tracking** - GPS-based time clock with project geofences  
👥 **Multi-Tenant** - Role-based access for different construction team roles  
📱 **Offline Support** - Sync functionality for remote construction sites
