function doGet(e) {
  let page = e.parameter.page || "main";
  return HtmlService.createTemplateFromFile(page)
    .evaluate()
    .setTitle("Fatura & Stok Yönetimi")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0");
}

function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

function checkAccess() {
  const userEmail = Session.getActiveUser().getEmail();
  const allowedUsers = [
    "v.sltcevikev@gmail.com",
    "v.sltcevik@gmail.com",
    "mvcgame26@gmail.com",
    "cbk2606@gmail.com",
    "buryakyapi@gmail.com",
    "kullanici3@gmail.com",
  ];
  return allowedUsers.includes(userEmail);
}

function sanitizeInput(input) {
  return String(input).replace(/[<>{}]/g, "");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getOrCreateYearFolder(baseFolderId, year) {
  const baseFolder = DriveApp.getFolderById(baseFolderId);
  const yearFolders = baseFolder.getFoldersByName(year);
  return yearFolders.hasNext()
    ? yearFolders.next()
    : baseFolder.createFolder(year);
}

function getNextFaturaNo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Fatura_liste");
  const currentYear = new Date().getFullYear().toString();
  const data = sheet
    .getRange("B2:B" + sheet.getLastRow())
    .getValues()
    .flat()
    .filter(String);
  const lastNo = data.length > 0 ? data[data.length - 1] : `${currentYear}0000`;
  const lastYear = lastNo.slice(0, 4);
  const lastSeq = parseInt(lastNo.slice(4)) || 0;
  const newSeq = lastYear === currentYear ? lastSeq + 1 : 1;
  return `${currentYear}${String(newSeq).padStart(4, "0")}`;
}

function getNextProformaNo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Proforma_liste");
  const currentYear = new Date().getFullYear().toString();
  const data = sheet
    .getRange("B2:B" + sheet.getLastRow())
    .getValues()
    .flat()
    .filter(String);
  const lastNo =
    data.length > 0
      ? data[data.length - 1].replace("P", "")
      : `${currentYear}0000`;
  const lastYear = lastNo.slice(0, 4);
  const lastSeq = parseInt(lastNo.slice(4)) || 0;
  const newSeq = lastYear === currentYear ? lastSeq + 1 : 1;
  return `P${currentYear}${String(newSeq).padStart(4, "0")}`;
}

function getMusteriList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Müşteri_bilgi");
  return sheet
    .getRange("B6:B" + sheet.getLastRow())
    .getValues()
    .flat()
    .filter(String);
}

function getMusteriInfo(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Müşteri_bilgi");
  const data = sheet.getRange("B6:G" + sheet.getLastRow()).getValues();
  const row = data.find((r) => r[0] === name);
  return row ? row[5] : "";
}

function getUrunList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Ürün_liste");
  return sheet
    .getRange("B11:B" + sheet.getLastRow())
    .getValues()
    .flat()
    .filter(String);
}

function getUrunInfo(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUrun = ss.getSheetByName("Ürün_liste");
  const sheetStok = ss.getSheetByName("Stok");
  const urunData = sheetUrun
    .getRange("B11:F" + sheetUrun.getLastRow())
    .getValues();
  const stokData = sheetStok
    .getRange("A2:B" + sheetStok.getLastRow())
    .getValues();
  const urunRow = urunData.find((r) => r[0] === name);
  const stokRow = stokData.find((r) => r[0] === name);
  return {
    carpan: urunRow ? urunRow[4] : "",
    stok: stokRow ? stokRow[1] : "0",
  };
}

function saveFatura(fatura) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Faturalar");
  const listeSheet = ss.getSheetByName("Fatura_liste");
  const stokSheet = ss.getSheetByName("Stok");
  const stokData = stokSheet
    .getRange("A2:B" + stokSheet.getLastRow())
    .getValues();
  const stokMap = new Map(stokData);

  for (const u of fatura.urunler) {
    const mevcut = parseInt(stokMap.get(u.ad) || 0);
    if (mevcut < parseInt(u.adet))
      throw new Error(`${u.ad} için yetersiz stok!`);
  }

  sheet.getRange("G18").setValue(fatura.no);
  sheet.getRange("G20").setValue(fatura.tarih);
  sheet.getRange("F25").setValue(getMusteriInfo(fatura.musteri));
  fatura.urunler.forEach((u, i) => {
    const row = 33 + i;
    sheet.getRange(`C${row}`).setValue(`PLAFORM BOARD PLASTIC ${u.ad}`);
    sheet.getRange(`D${row}`).setValue(u.adet);
    sheet.getRange(`E${row}`).setValue(u.fiyat);
    sheet.getRange(`F${row}`).setValue(`${u.adet * u.carpan} M²`);
    sheet.getRange(`G${row}`).setValue(u.adet * u.fiyat);
  });

  const year = new Date().getFullYear().toString();
  const folder = getOrCreateYearFolder(
    "1sW_DnDrs3HgeK3e7DUCQ2vIcix7VpfoY",
    year
  );
  const pdfBlob = sheet.getParent().getAs("application/pdf");
  const file = folder.createFile(
    pdfBlob.setName(`Fatura_${fatura.musteri}_${fatura.tarih}_${fatura.no}.pdf`)
  );

  fatura.urunler.forEach((u) => {
    const row = stokData.findIndex((r) => r[0] === u.ad) + 2;
    const yeniStok = parseInt(stokMap.get(u.ad)) - parseInt(u.adet);
    stokSheet.getRange(`B${row}`).setValue(yeniStok);
  });

  const lastRow = listeSheet.getLastRow() + 1;
  listeSheet
    .getRange(`B${lastRow}:H${lastRow}`)
    .setValues([
      [
        fatura.no,
        "BURYAK SARL",
        fatura.musteri,
        fatura.tarih,
        "Plaform",
        sheet.getRange("G50").getValue(),
        file.getUrl(),
      ],
    ]);

  return file.getUrl();
}

function saveProforma(proforma) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Proforma");
  const listeSheet = ss.getSheetByName("Proforma_liste");

  sheet.getRange("G18").setValue(proforma.no);
  sheet.getRange("G20").setValue(proforma.tarih);
  sheet.getRange("F25").setValue(getMusteriInfo(proforma.musteri));
  proforma.urunler.forEach((u, i) => {
    const row = 33 + i;
    sheet.getRange(`C${row}`).setValue(`PLAFORM BOARD PLASTIC ${u.ad}`);
    sheet.getRange(`D${row}`).setValue(u.adet);
    sheet.getRange(`E${row}`).setValue(u.fiyat);
    sheet.getRange(`F${row}`).setValue(`${u.adet * u.carpan} M²`);
    sheet.getRange(`G${row}`).setValue(u.adet * u.fiyat);
  });

  const year = new Date().getFullYear().toString();
  const folder = getOrCreateYearFolder(
    "1sW_DnDrs3HgeK3e7DUCQ2vIcix7VpfoY",
    year
  );
  const pdfBlob = sheet.getParent().getAs("application/pdf");
  const file = folder.createFile(
    pdfBlob.setName(
      `Proforma_${proforma.musteri}_${proforma.tarih}_${proforma.no}.pdf`
    )
  );

  const lastRow = listeSheet.getLastRow() + 1;
  listeSheet
    .getRange(`B${lastRow}:H${lastRow}`)
    .setValues([
      [
        proforma.no,
        "BURYAK SARL",
        proforma.musteri,
        proforma.tarih,
        "Plaform",
        sheet.getRange("G50").getValue(),
        file.getUrl(),
      ],
    ]);

  return file.getUrl();
}

function getFaturaList(type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(
    type === "fatura" ? "Fatura_liste" : "Proforma_liste"
  );
  if (!sheet || sheet.getLastRow() < 2) return [];

  const data = sheet.getRange("B2:H" + sheet.getLastRow()).getValues();
  return data.map((row) => ({
    faturaNo: row[0],
    musteri: row[2],
    tarih: row[3],
    pdfUrl: row[6],
  }));
}

function getFaturaByIndex(index, type) {
  return getFaturaList(type)[index];
}
