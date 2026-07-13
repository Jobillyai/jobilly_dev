/**
 * Paste into Google Sheets → Extensions → Apps Script → Run importDevLog()
 * Sheet: https://docs.google.com/spreadsheets/d/1kFsp0jS_WTR0OgNmVqpo9Of3WeRnkFTBkBCXuk3bYck
 */
function importDevLog() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  const csvUrl =
    "https://raw.githubusercontent.com/Jobillyai/jobilly_dev/nemesis/public/downloads/google-sheet-import.csv";

  const response = UrlFetchApp.fetch(csvUrl);
  const lines = response.getContentText().split(/\r?\n/).filter(Boolean);
  const rows = lines.map((line) => {
    const cells = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  });

  sheet.clear();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);

  // UI inspiration links (below data)
  const start = rows.length + 2;
  sheet.getRange(start, 1).setValue("UI Inspiration");
  sheet.getRange(start + 1, 1).setValue("https://tsenta.com/");
  sheet.getRange(start + 2, 1).setValue("https://sociality.io/careers?ref=saaspo.com");
  sheet.getRange(start + 3, 1).setValue("https://yujisatojr.github.io/react-portfolio-template/");
}
