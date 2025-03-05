function doGet(e) {
  let page = e.parameter.page || "main"; // Varsayılan olarak "main" sayfasını yükle

  return HtmlService.createTemplateFromFile(page).evaluate();
}
function myURL() {
  return ScriptApp.getService().getUrl();
}

function include(musteriYonet) {
  return HtmlService.createHtmlOutputFromFile(musteriYonet).getContent();
}

// Kullanıcı e-posta doğrulama fonksiyonu
function checkAccess() {
  var userEmail = Session.getEffectiveUser().getEmail();
  var allowedUsers = [
    "v.sltcevikev@gmail.com",
    "v.sltcevik@gmail.com",
    "mvcgame26@gmail.com",
    "cbk2606@gmail.com",
    "buryakyapi@gmail.com",
    "kullanici3@gmail.com",
  ];

  return allowedUsers.includes(userEmail);
}

// Kullanıcı girdilerini temizleme fonksiyonu (XSS önlemi)
function sanitizeInput(input) {
  return input.replace(/[<>{}]/g, "");
}
function stokEkle(urunAdi, miktar) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Stok");

  var data = sheet.getRange("A2:B" + sheet.getLastRow()).getValues();
  var urunVarMi = false;

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === urunAdi) {
      var mevcutMiktar = sheet.getRange("B" + (i + 2)).getValue();
      sheet.getRange("B" + (i + 2)).setValue(mevcutMiktar + miktar);
      urunVarMi = true;
      break;
    }
  }

  if (!urunVarMi) {
    var lastRow = sheet.getLastRow() + 1;
    sheet.getRange("A" + lastRow).setValue(urunAdi);
    sheet.getRange("B" + lastRow).setValue(miktar);
  }
}

// Stokları Görüntüleme Fonksiyonu
function stokGoruntule() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Stok");

  var data = sheet.getRange("A2:B" + sheet.getLastRow()).getValues();
  var stokListesi = [];

  for (var i = 0; i < data.length; i++) {
    if (data[i][0]) {
      stokListesi.push({
        ad: data[i][0],
        miktar: data[i][1],
      });
    }
  }

  return stokListesi;
}

// Fatura Kesildiğinde Stoktan Düşme
function stokGuncelle(faturaUrunler) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Stok");

  var data = sheet.getRange("A2:B" + sheet.getLastRow()).getValues(); // A (Ürün Adı), B (Stok Miktarı)
  var stokMap = {};

  // Stok verisini bir nesne olarak sakla (hızlı erişim için)
  for (var i = 0; i < data.length; i++) {
    stokMap[data[i][0]] = { row: i + 2, miktar: data[i][1] };
  }

  faturaUrunler.forEach(function (urun) {
    var urunAdi = urun.ad;
    var satilanMiktar = parseInt(urun.adet, 10);

    if (stokMap[urunAdi]) {
      var mevcutMiktar = stokMap[urunAdi].miktar;
      var satirNumarasi = stokMap[urunAdi].row;

      if (mevcutMiktar >= satilanMiktar) {
        sheet
          .getRange("B" + satirNumarasi)
          .setValue(mevcutMiktar - satilanMiktar);
        Logger.log(
          `${urunAdi} güncellendi. Yeni stok: ${mevcutMiktar - satilanMiktar}`
        );
      } else {
        Logger.log(`UYARI: ${urunAdi} için yetersiz stok!`);
      }
    } else {
      Logger.log(`HATA: ${urunAdi} stokta bulunamadı!`);
    }
  });
}

// En son fatura numarasını getirip +1 ekleyerek döndüren fonksiyon
function getNextFaturaNo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Fatura_liste");

  var data = sheet.getRange("B:B").getValues().flat().filter(String); // Boş olmayanları al
  var lastFaturaNo = data.length > 0 ? parseInt(data[data.length - 1]) : 1000; // Son dolu hücreyi al

  return (lastFaturaNo + 1).toString();
}

// Müşteri listesini almak için fonksiyon
function getMusteriListesi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Müşteri_bilgi");

  // Müşteri adlarını B6 hücresinden al
  var musteriAdlari = sheet.getRange("B6:B").getValues().flat().filter(String);

  return musteriAdlari;
}

// Müşteri seçildiğinde, o satırdaki G sütunundaki bilgiyi döndüren fonksiyon
function getMusteriGInfo(musteriAdi) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Müşteri_bilgi");

  // Müşteri adını arayıp, ilgili satırdaki G sütununu al
  var data = sheet.getRange("B6:G" + sheet.getLastRow()).getValues();

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === musteriAdi) {
      return data[i][5]; // G sütunundaki değer (5. index)
    }
  }
  return null; // Eğer müşteri bulunmazsa
}

// Ürün listesini almak için fonksiyon
function getUrunListesi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Ürün_liste");

  // Müşteri adlarını B6 hücresinden al
  var urunAdlari = sheet.getRange("B11:B").getValues().flat().filter(String);

  return urunAdlari;
}

// Ürün seçildiğinde, o satırdaki F sütunundaki bilgiyi döndüren fonksiyon
function getUrunGInfo(urunAdı) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Ürün_liste");

  // Ürün adını arayıp, ilgili satırdaki F sütununu al
  var data = sheet.getRange("B11:F" + sheet.getLastRow()).getValues();

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === urunAdı) {
      return data[i][4]; // F sütunundaki değer (4. index)
    }
  }
  return null; // Eğer ürün bulunmazsa
}
// PDF oluştur ve Drive'a kaydet
function createPDF(musteriAdi, tarih, faturaNo) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Faturalar");

    // PDF URL'sini oluştur
    var url =
      ss.getUrl().replace(/edit$/, "") +
      "export?format=pdf" +
      "&gid=" +
      sheet.getSheetId() +
      "&range=A11:H66" +
      "&size=A4" +
      "&portrait=true" +
      "&fitw=true" +
      "&gridlines=false";

    // PDF'i Drive'a kaydet
    var pdfBlob = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    }).getBlob();
    var folder = DriveApp.getFolderById("1GhFcMoxMIWo3t825Ubr_cy2smy56-fhe");
    var file = folder.createFile(
      pdfBlob.setName(`Facture_${musteriAdi}_${tarih}_${faturaNo}.pdf`)
    );

    var downloadUrl = file.getDownloadUrl(); // Kullanıcı için indirme linki
    var driveUrl = file.getUrl(); // Drive'da açma linki

    return { downloadUrl: downloadUrl, driveUrl: driveUrl }; // İndirme ve Görme linkini döndür
  } catch (e) {
    Logger.log("Hata: " + e.toString());
    return null;
  }
}

// Fatura_liste sayfasını güncelle
function updateFaturaListe(faturaNo, musteriAdi, tarih, g50Value, pdfUrl) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Fatura_liste");

  var lastRow = sheet.getLastRow() + 1;

  sheet.getRange(`B${lastRow}`).setValue(faturaNo);
  sheet.getRange(`C${lastRow}`).setValue("Buryak SARL");
  sheet.getRange(`D${lastRow}`).setValue(musteriAdi);
  sheet.getRange(`E${lastRow}`).setValue(tarih);
  sheet.getRange(`F${lastRow}`).setValue("Plaform");
  sheet.getRange(`G${lastRow}`).setValue(g50Value);
  sheet.getRange(`H${lastRow}`).setValue(pdfUrl.driveUrl);
}

// Faturalar sayfasında temizlik yap
function clearFaturalarRange() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Faturalar");
  sheet.getRange("C33:G47").clearContent();
}

function faturaEkle(faturaNo, tarih, urunler, musteriAdi) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Faturalar");

  faturaNo = sanitizeInput(faturaNo);

  // En son dolu satırı dinamik olarak al
  var lastRow = sheet.getRange("C:C").getValues().filter(String).length;
  var startRow = lastRow >= 33 ? lastRow + 1 : 33; // 33. satırdan başla

  // Fatura bilgilerini sabit hücrelere yaz
  sheet.getRange("G18").setValue(faturaNo);
  sheet.getRange("G20").setValue(tarih);

  // Önce stok kontrolü yap
  var stokDurumu = stokKontrol(urunler);
  if (!stokDurumu.success) {
    return stokDurumu.message; // Alert mesajı dönecek
  }
  // Ürünleri alt alta ekle
  urunler.forEach(function (urun, index) {
    var currentRow = startRow + index;

    var birlesikMetin = "PLAFORM BOARD PLASTIC " + urun.ad;
    var temizlenmisMetin = sanitizeInput(birlesikMetin);

    sheet.getRange("C" + currentRow).setValue(temizlenmisMetin);

    sheet.getRange("D" + currentRow).setValue(sanitizeInput(urun.adet));
    sheet.getRange("E" + currentRow).setValue(sanitizeInput(urun.fiyat));
    var metreKareHesap = urun.adet * urun.gInfo;
    var birimToplam = urun.adet * urun.fiyat;
    sheet.getRange("F" + currentRow).setValue(`${metreKareHesap} M²`);
    sheet.getRange("G" + currentRow).setValue(birimToplam);
  });

  SpreadsheetApp.flush();
  stokGuncelle(urunler); // Fatura kesildiğinde stoktan düşür
  var pdfUrl = createPDF(musteriAdi, tarih, faturaNo);
  // Ek işlemler
  var g50Value = sheet.getRange("G50").getValue();

  // 2. Fatura_liste sayfasını güncelle
  updateFaturaListe(faturaNo, musteriAdi, tarih, g50Value, pdfUrl);

  // 3. Temizlik yap
  clearFaturalarRange();
  return pdfUrl.downloadUrl;
}
function stokKontrol(urunler) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Stok");

  var data = sheet.getRange("A2:B" + sheet.getLastRow()).getValues(); // A (Ürün Adı), B (Stok Miktarı)
  var stokMap = {};

  // Stokları Map'e aktarma (hızlı erişim için)
  for (var i = 0; i < data.length; i++) {
    stokMap[data[i][0]] = data[i][1];
  }

  var eksikStoklar = [];

  // Satılmak istenen ürünleri kontrol et
  urunler.forEach(function (urun) {
    var mevcutMiktar = stokMap[urun.ad] || 0;
    if (mevcutMiktar < urun.adet) {
      eksikStoklar.push(
        `${urun.ad} (Stok: ${mevcutMiktar}, İstenen: ${urun.adet})`
      );
    }
  });

  if (eksikStoklar.length > 0) {
    return {
      success: false,
      message: `Yetersiz stok! Satış yapılamıyor:\n${eksikStoklar.join("\n")}`,
    };
  }

  return { success: true };
}

function updateFaturaSheet(musteriBilgisi) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Faturalar");

  if (sheet) {
    sheet.getRange("F25").setValue(musteriBilgisi);
  }
}

// En son Proforma fatura numarasını getirip +1 ekleyerek döndüren fonksiyon
function getNextFaturaNoProforma() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Proforma_liste");

  var data = sheet.getRange("B:B").getValues().flat().filter(String); // Boş olmayanları al
  var lastFaturaNo = data.length > 0 ? data[data.length - 1] : "P1000"; // Varsayılan P1000

  // Eğer son numara P ile başlıyorsa, sayıyı çıkar ve artır
  if (lastFaturaNo.startsWith("P")) {
    var number = parseInt(lastFaturaNo.replace("P", ""), 10);
    if (isNaN(number)) number = 1000; // NaN kontrolü
    return "P" + (number + 1);
  } else {
    return "P" + (parseInt(lastFaturaNo, 10) + 1); // Eski veriler için
  }
}

// Proforma  PDF oluştur ve Drive'a kaydet
function createPDFProforma(musteriAdi, tarih, faturaNo) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Proforma");

    // PDF URL'sini oluştur
    var url =
      ss.getUrl().replace(/edit$/, "") +
      "export?format=pdf" +
      "&gid=" +
      sheet.getSheetId() +
      "&range=A11:H66" +
      "&size=A4" +
      "&portrait=true" +
      "&fitw=true" +
      "&gridlines=false";

    // PDF'i Drive'a kaydet
    var pdfBlob = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    }).getBlob();
    var folder = DriveApp.getFolderById("1GqxbUbK8SYzTeQQlxWoB248rzGkHJRFH");
    var file = folder.createFile(
      pdfBlob.setName(`Proforma_${musteriAdi}_${tarih}_${faturaNo}.pdf`)
    );

    var downloadUrl = file.getDownloadUrl(); // Kullanıcı için indirme linki
    var driveUrl = file.getUrl(); // Drive'da açma linki

    return { downloadUrl: downloadUrl, driveUrl: driveUrl }; // İndirme ve Görme linkini döndür
  } catch (e) {
    Logger.log("Hata: " + e.toString());
    return null;
  }
}

// Fatura_liste sayfasını güncelle
function updateFaturaListeProforma(
  faturaNo,
  musteriAdi,
  tarih,
  g50Value,
  pdfUrl
) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Proforma_liste");

  var lastRow = sheet.getLastRow() + 1;

  sheet.getRange(`B${lastRow}`).setValue(faturaNo);
  sheet.getRange(`C${lastRow}`).setValue("Buryak SARL");
  sheet.getRange(`D${lastRow}`).setValue(musteriAdi);
  sheet.getRange(`E${lastRow}`).setValue(tarih);
  sheet.getRange(`F${lastRow}`).setValue("Plaform");
  sheet.getRange(`G${lastRow}`).setValue(g50Value);
  sheet.getRange(`H${lastRow}`).setValue(pdfUrl.driveUrl);
}

// Faturalar sayfasında temizlik yap
function clearFaturalarRangeProforma() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Proforma");
  sheet.getRange("C33:G47").clearContent();
}

function faturaEkleProforma(faturaNo, tarih, urunler, musteriAdi) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Proforma");

  faturaNo = sanitizeInput(faturaNo);

  // En son dolu satırı dinamik olarak al
  var lastRow = sheet.getRange("C:C").getValues().filter(String).length;
  var startRow = lastRow >= 33 ? lastRow + 1 : 33; // 33. satırdan başla

  // Fatura bilgilerini sabit hücrelere yaz
  sheet.getRange("G18").setValue(faturaNo);
  sheet.getRange("G20").setValue(tarih);

  // Ürünleri alt alta ekle
  urunler.forEach(function (urun, index) {
    var currentRow = startRow + index;

    var birlesikMetin = "PLAFORM BOARD PLASTIC " + urun.ad;
    var temizlenmisMetin = sanitizeInput(birlesikMetin);

    sheet.getRange("C" + currentRow).setValue(temizlenmisMetin);

    sheet.getRange("D" + currentRow).setValue(sanitizeInput(urun.adet));
    sheet.getRange("E" + currentRow).setValue(sanitizeInput(urun.fiyat));
    var metreKareHesap = urun.adet * urun.gInfo;
    var birimToplam = urun.adet * urun.fiyat;
    sheet.getRange("F" + currentRow).setValue(`${metreKareHesap} M²`);
    sheet.getRange("G" + currentRow).setValue(birimToplam);
  });

  SpreadsheetApp.flush();

  var pdfUrl = createPDFProforma(musteriAdi, tarih, faturaNo);
  // Ek işlemler
  var g50Value = sheet.getRange("G50").getValue();

  // 2. Fatura_liste sayfasını güncelle
  updateFaturaListeProforma(faturaNo, musteriAdi, tarih, g50Value, pdfUrl);

  // 3. Temizlik yap
  clearFaturalarRangeProforma();
  return pdfUrl.downloadUrl;
}

function updateFaturaSheetProforma(musteriBilgisi) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Proforma");

  if (sheet) {
    sheet.getRange("F25").setValue(musteriBilgisi);
  }
}

// Kod.gs'e eklenmesi gereken fonksiyonlar
function getAllCustomers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Müşteri_bilgi");
  const data = sheet.getRange("B6:I" + sheet.getLastRow()).getValues();

  return data.map((row) => ({
    firma: row[0],
    adres: row[1],
    ice: row[2],
    telefon: row[3],
    email: row[4],
    referans: row[6],
    notlar: row[7],
  }));
}

function searchCustomers(query) {
  const allCustomers = getAllCustomers();
  query = query.toLowerCase();

  return allCustomers.filter(
    (c) =>
      c.firma.toLowerCase().includes(query) ||
      c.ice.includes(query) ||
      c.referans.toLowerCase().includes(query)
  );
}

function getCustomerByIndex(index) {
  return getAllCustomers()[index];
}

function saveCustomerData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Müşteri_bilgi");
  const row = data.rowIndex
    ? parseInt(data.rowIndex) + 6
    : sheet.getLastRow() + 1;

  const values = [
    data.firma,
    data.adres,
    data.ice,
    data.telefon,
    data.email,
    "", // F sütunu (boş bırakıldı)
    data.referans,
    data.notlar,
  ];

  sheet.getRange(`B${row}:I${row}`).setValues([values]);
}

function getUrunStokBilgisi(urunAdi) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Stok");

  var data = sheet.getRange("A2:B" + sheet.getLastRow()).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === urunAdi) {
      return data[i][1]; // Stok miktarı
    }
  }
  return "Stokta yok";
}

function getFaturaList(type) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(
    type === "fatura" ? "Fatura_liste" : "Proforma_liste"
  );
  var lastRow = sheet.getLastRow();

  // Eğer veri yoksa boş array döndür
  if (lastRow < 2) {
    Logger.log(`No data found in ${type}_liste`);
    return [];
  }

  var data = sheet.getRange("B2:H" + lastRow).getValues();
  Logger.log(`Data fetched from ${type}_liste: ` + JSON.stringify(data)); // Hata ayıklama

  return data.map((row) => ({
    faturaNo: row[0] || "", // B sütunu
    musteri: row[2] || "", // D sütunu
    tarih: row[3] || "", // E sütunu
    pdfUrl: row[6] || "", // H sütunu
  }));
}

function getFaturaByIndex(index, type) {
  var list = getFaturaList(type);
  Logger.log(
    `Fetching item at index ${index} from ${type}: ` +
      JSON.stringify(list[index])
  );
  return list[index];
}
