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

## Order State Mapping

`Dropea_Update.js` contains a mapping from Dropea's `OrderStateEnum` to the values used in the spreadsheet. The main states are:

| Dropea state                        | Sheet value    |
|--------------------------------------|---------------|
| `DELIVERED`, `CHARGED`              | Entregado     |
| `REJECTED`, `CANCELLED`, `RETURNED` | Devolucion    |
| `TRANSIT`, `PREPARED`, `PENDING`    | En tránsito   |
| `INCIDENCE`                         | INCIDENCIA    |

Any unrecognized state falls back to **INCIDENCIA** and a warning is logged.

## Fraud Detection Settings

Antifraud thresholds and API options live in `Config.js` under `FRAUD_CONFIG`. Relevant fields include:

- `analisis.timeoutAPI` – timeout passed to `UrlFetchApp.fetch` when querying the IP API.
- `analisis.pausaEntreConsultas` – delay between API calls.
- `analisis.ventanaHorasRepeticion` – hours considered when checking repeated IPs.
- `apis.geolocalizacion.url` and related fields – endpoint used for IP lookups.

Adjust these values if your detection rules or provider settings differ.

## Maintenance Tools

The `Limpiar LOG de sincronización` option clears the `LOG_Dropea_Sync` sheet,
leaving only the headers. Use it periodically to keep the log small.

## License

This project is licensed under the [MIT License](LICENSE).
