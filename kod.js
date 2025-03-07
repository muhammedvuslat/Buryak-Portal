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

  if (!sheet) {
    Logger.log("Fatura_liste sheet not found");
    return `${currentYear}0001`; // Varsayılan
  }

  const lastRow = sheet.getLastRow();
  const data =
    lastRow > 1
      ? sheet
          .getRange("B2:B" + lastRow)
          .getValues()
          .flat()
          .filter((v) => v !== "")
      : [];
  Logger.log("Fatura_liste data: " + JSON.stringify(data));

  // Son numarayı al, yoksa varsayılan kullan
  let lastNo = data.length > 0 ? data[data.length - 1] : `${currentYear}0000`;
  Logger.log("Raw lastNo: " + lastNo + " (type: " + typeof lastNo + ")");

  // lastNo’yu string’e zorla
  lastNo = String(lastNo || `${currentYear}0000`);
  Logger.log("Converted lastNo: " + lastNo);

  // Yıl ve sıra numarasını ayır
  const lastYear = lastNo.slice(0, 4);
  const lastSeq = parseInt(lastNo.slice(4)) || 0;
  const newSeq = lastYear === currentYear ? lastSeq + 1 : 1;
  const newNo = `${currentYear}${String(newSeq).padStart(4, "0")}`;
  Logger.log("Generated faturaNo: " + newNo);
  return newNo;
}

function getNextProformaNo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Proforma_liste");
  const currentYear = new Date().getFullYear().toString();

  if (!sheet) {
    Logger.log("Proforma_liste sheet not found");
    return `P${currentYear}0001`; // Varsayılan
  }

  const lastRow = sheet.getLastRow();
  const data =
    lastRow > 1
      ? sheet
          .getRange("B2:B" + lastRow)
          .getValues()
          .flat()
          .filter((v) => v !== "")
      : [];
  Logger.log("Proforma_liste data: " + JSON.stringify(data));

  // Son numarayı al, yoksa varsayılan kullan
  let lastNo = data.length > 0 ? data[data.length - 1] : `${currentYear}0000`;
  Logger.log("Raw lastNo: " + lastNo + " (type: " + typeof lastNo + ")");

  // lastNo’yu string’e zorla ve P’yi kaldır
  lastNo = String(lastNo || `${currentYear}0000`).replace("P", "");
  Logger.log("Converted lastNo (without P): " + lastNo);

  // Yıl ve sıra numarasını ayır
  const lastYear = lastNo.slice(0, 4);
  const lastSeq = parseInt(lastNo.slice(4)) || 0;
  const newSeq = lastYear === currentYear ? lastSeq + 1 : 1;
  const newNo = `P${currentYear}${String(newSeq).padStart(4, "0")}`;
  Logger.log("Generated proformaNo: " + newNo);
  return newNo;
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
  const data = sheet.getRange("B6:I" + sheet.getLastRow()).getValues();
  const row = data.find((r) => r[0] === name);
  return row ? row[5] : ""; // G sütunu (formül) dönüyor
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

function createPDF(sheetName, fileName, folder, tarih, formNo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const url =
    ss.getUrl().replace(/edit$/, "") +
    "export?format=pdf" +
    "&gid=" +
    sheet.getSheetId() +
    "&range=A11:H66" +
    "&size=A4" +
    "&portrait=true" +
    "&fitw=true" +
    "&gridlines=false";

  // URL’den PDF blob’u al
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
  });
  const blob = response.getBlob().setName(fileName);

  // Drive’a kaydet
  const file = folder.createFile(blob);
  return file.getUrl();
}

function clearRange(sheetName, range) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  sheet.getRange(range).clearContent();
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

  // Stok kontrolü
  for (const u of fatura.urunler) {
    const mevcut = parseInt(stokMap.get(u.ad) || 0);
    if (mevcut < parseInt(u.adet))
      throw new Error(`${u.ad} için yetersiz stok!`);
  }

  // Faturalar sayfasını güncelle
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

  // Verilerin işlenmesini bekle
  SpreadsheetApp.flush();

  // PDF oluştur
  const year = new Date().getFullYear().toString();
  const folder = getOrCreateYearFolder(
    "1sW_DnDrs3HgeK3e7DUCQ2vIcix7VpfoY",
    year
  );
  const pdfUrl = createPDF(
    "Faturalar",
    `${fatura.no}_${fatura.musteri}_${fatura.tarih}.pdf`,
    folder,
    fatura.tarih,
    fatura.no
  );

  // Stok güncelle
  fatura.urunler.forEach((u) => {
    const row = stokData.findIndex((r) => r[0] === u.ad) + 2;
    const yeniStok = parseInt(stokMap.get(u.ad)) - parseInt(u.adet);
    stokSheet.getRange(`B${row}`).setValue(yeniStok);
  });

  // Fatura_liste güncelle
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
        pdfUrl,
      ],
    ]);

  // Temizlik
  clearRange("Faturalar", "C33:G47");

  return pdfUrl;
}

function saveProforma(proforma) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Proforma");
  const listeSheet = ss.getSheetByName("Proforma_liste");

  // Proforma sayfasını güncelle
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

  // Verilerin işlenmesini bekle
  SpreadsheetApp.flush();

  // PDF oluştur
  const year = new Date().getFullYear().toString();
  const folder = getOrCreateYearFolder(
    "1sMvWeG6mWDbaV21zAXvgSQh7A6SnOSOL",
    year
  );
  const pdfUrl = createPDF(
    "Proforma",
    `${proforma.no}_${proforma.musteri}_${proforma.tarih}.pdf`,
    folder,
    proforma.tarih,
    proforma.no
  );

  // Proforma_liste güncelle
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
        pdfUrl,
      ],
    ]);

  // Temizlik
  clearRange("Proforma", "C33:G47");

  return pdfUrl;
}

function getFaturaList(type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(
    type === "fatura" ? "Fatura_liste" : "Proforma_liste"
  );
  Logger.log(
    `Fetching ${type} list from sheet: ${sheet ? sheet.getName() : "Not found"}`
  );

  if (!sheet) {
    Logger.log(`Sheet not found for type: ${type}`);
    return [];
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log(`No data found in ${type} sheet`);
    return [];
  }

  const data = sheet.getRange("B2:H" + lastRow).getValues();
  Logger.log(`Raw data for ${type}: ${JSON.stringify(data)}`);

  const formattedData = data.map((row) => ({
    faturaNo: row[0] ? row[0].toString() : "",
    musteri: row[2] || "",
    tarih: row[3] ? new Date(row[3]).toLocaleDateString("tr-TR") : "",
    tutar: row[5] || "",
    pdfUrl: row[6] || "",
  }));

  Logger.log(`Formatted data for ${type}: ${JSON.stringify(formattedData)}`);
  return formattedData;
}

function getFaturaByIndex(index, type) {
  const list = getFaturaList(type);
  Logger.log(
    `Getting ${type} at index ${index}: ${JSON.stringify(list[index])}`
  );
  return list[index];
}

function getStokList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Stok");
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const data = sheet.getRange("A2:B" + lastRow).getValues();
  return data.map((row) => ({
    urunAdi: row[0],
    miktar: row[1],
  }));
}

function addToStok(urunAdi, miktar) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Stok");
  const data = sheet.getRange("A2:B" + sheet.getLastRow()).getValues();
  const stokMap = new Map(data);

  if (stokMap.has(urunAdi)) {
    // Ürün varsa miktarı güncelle
    const mevcutMiktar = parseInt(stokMap.get(urunAdi));
    const yeniMiktar = mevcutMiktar + miktar;
    const row = data.findIndex((r) => r[0] === urunAdi) + 2;
    sheet.getRange(`B${row}`).setValue(yeniMiktar);
  } else {
    // Yeni ürün ekle
    const lastRow = sheet.getLastRow() + 1;
    sheet.getRange(`A${lastRow}:B${lastRow}`).setValues([[urunAdi, miktar]]);
  }
}

function getMusteriListFull() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Müşteri_bilgi");
  const lastRow = sheet.getLastRow();
  if (lastRow < 6) return [];

  const data = sheet.getRange("B6:I" + lastRow).getValues();
  return data.map((row) => ({
    firma: row[0],
    adres: row[1],
    iceKodu: row[2],
    telefon: row[3],
    email: row[4],
    referans: row[6],
    notlar: row[7],
  }));
}

function getMusteriByIndex(index) {
  const musteriList = getMusteriListFull();
  return musteriList[index];
}

function saveMusteri(musteri) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Müşteri_bilgi");
  const lastRow = sheet.getLastRow();
  let row;

  if (musteri.index !== null) {
    // Düzenleme
    row = 6 + musteri.index;
  } else {
    // Yeni ekleme
    row = lastRow + 1;
  }

  // Verileri yaz (B:I sırası)
  sheet.getRange(`B${row}:I${row}`).setValues([
    [
      musteri.firma,
      musteri.adres,
      musteri.iceKodu,
      musteri.telefon,
      musteri.email,
      "",
      musteri.referans,
      musteri.notlar, // G sütunu boş bırakılır
    ],
  ]);

  // G sütununa formül ekle
  const formula = `="${musteri.firma}" & CHAR(10) & "${musteri.adres}" & CHAR(10) & "ICE: ${musteri.iceKodu}"`;
  sheet.getRange(`G${row}`).setFormula(formula);
}

function saveNewProduct(product) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Ürün_liste");
  if (!sheet) throw new Error("Ürün_liste sheet’i bulunamadı!");

  const lastRow = sheet.getLastRow();
  const newRow = lastRow + 1;

  // B sütunu: Ürün adı formülü =("(" & C<satır> & " X " & D<satır> & " X " & E<satır> & " )")
  const urunAdiFormula = `=("("&C${newRow}&" X "&D${newRow}&" X "&E${newRow}&" MM)")`;

  // C sütunu: Uzunluk
  const uzunluk = product.uzunluk;

  // D sütunu: Genişlik
  const genislik = product.genislik;

  // E sütunu: Kalınlık
  const kalinlik = product.kalinlik;

  // F sütunu: Alan formülü =C<satır>*D<satır>/1000000
  const alanFormula = `=C${newRow}*D${newRow}/1000000`;

  // G sütunu: Açıklama (varsayılan "PLAFORM BOARD PLASTIC")
  const aciklama = product.aciklama || "PLAFORM BOARD PLASTIC";

  // H sütunu: Formül =G<satır>&CHAR(10)&B<satır>
  const hFormula = `=G${newRow}&CHAR(10)&B${newRow}`;

  // Yeni satırı ekle
  sheet.getRange(`B${newRow}:H${newRow}`).setValues([
    [
      urunAdiFormula, // B: Ürün adı formülü
      uzunluk, // C: Uzunluk
      genislik, // D: Genişlik
      kalinlik, // E: Kalınlık
      alanFormula, // F: Alan formülü
      aciklama, // G: Açıklama
      hFormula, // H: G + CHAR(10) + B
    ],
  ]);

  Logger.log(`New product added at row ${newRow}: ${JSON.stringify(product)}`);
}
