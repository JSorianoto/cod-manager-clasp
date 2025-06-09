# COD Manager - Dropea Integration

This project synchronizes orders with the Dropea API. The API key is no longer hard-coded in the code. Instead, it is read from **Script Properties** in your Apps Script project.

## Setting the Script Properties
1. Open the project in the Google Apps Script editor.
2. Choose **File → Project properties** and open the **Script Properties** tab.
3. Create the following keys and paste your values:
   - `DROPEA_API_KEY` – Dropea API token.
   - `DROPEA_API_URL` – optional custom endpoint. If not set, the default endpoint `https://api.dropea.com/graphql/dropshippers` is used.
4. Save the properties and redeploy the project if necessary.

Once these properties are set, the scripts `Dropea_Update.js` and `COD_Manager_Dropea.js` will automatically read the token and endpoint from the script properties.

## Deploying the Apps Script
1. Install Node.js and the [clasp](https://github.com/google/clasp) tool: `npm install -g @google/clasp`.
2. Run `clasp login` and authorize your Google account.
3. From this project folder run `clasp push` to upload the code to the Apps Script project specified in `.clasp.json`.
4. Open the editor with `clasp open` (or visit <https://script.google.com/> and open the project) and select **Deploy → New deployment** to create a new deployment.

## Enabling Services
Enable the following services from the **Services** tab in the Apps Script editor:
- **Apps Script API** and **Google Sheets API** (needed for clasp and spreadsheet access).
- Optionally enable **Gmail API** if you wish to send email notifications from `Utilities.js`.

## Configuring Time-based Triggers
Create triggers from **Triggers → Add Trigger** in the editor:
- `actualizarDesdeDropea` – run hourly to sync statuses from Dropea.
- `analizarNuevosPedidos` – run once per day to analyze new orders for fraud.
- `ejecutarMantenimientoAutomatico` – run daily to clean logs and caches.
Adjust the frequency as needed.

## Example Usage
**Running Fraud Analysis**
1. Open your spreadsheet.
2. Choose **📦 COD Manager → 🛡️ Análisis de Fraude → 🔍 Analizar Nuevos Pedidos**.
3. The results appear in column **R** of the `ORDERS` sheet.

**Synchronizing with Dropea**
1. Choose **📦 COD Manager → 🔄 Actualizar Pedidos → 📡 Desde Dropea API (Automático)**.
2. The script updates the order statuses using the Dropea API.
