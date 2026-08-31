import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

let FileSystem, Sharing, DocumentPicker;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
  Sharing = require('expo-sharing');
  DocumentPicker = require('expo-document-picker');
}

export function generateTemplate(subjects) {
  const wb = XLSX.utils.book_new();

  const data = [['Subject', 'Chapter Name']];
  subjects.forEach(subj => {
    const chapters = subj.chapters || [];
    if (chapters.length === 0) {
      data.push([subj.name, '']);
    } else {
      chapters.forEach(ch => {
        data.push([subj.name, ch]);
      });
    }
  });

  if (data.length === 1) {
    data.push(['Physics', 'Example Chapter 1']);
    data.push(['Physics', 'Example Chapter 2']);
    data.push(['Chemistry', 'Example Chapter 1']);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Chapters');

  return wb;
}

export async function downloadTemplate(subjects) {
  const wb = generateTemplate(subjects);
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  if (Platform.OS === 'web') {
    const binaryStr = atob(wbout);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chapters_template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  const uri = dir + 'chapters_template.xlsx';
  await FileSystem.writeAsStringAsync(uri, wbout, { encoding: 'base64' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Save Chapter Template',
    });
  }
  return uri;
}

function readWebFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function importFromExcel() {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { resolve(null); return; }
        try {
          const base64 = await readWebFile(file);
          const wb = XLSX.read(base64, { type: 'base64' });
          const data = parseSheet(wb);
          resolve(data);
        } catch (err) {
          console.log('Import error:', err);
          resolve(null);
        }
      };
      input.click();
    });
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const fileUri = result.assets[0].uri;
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
  const wb = XLSX.read(base64, { type: 'base64' });
  return parseSheet(wb);
}

function parseSheet(wb) {
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (data.length < 2) return null;

  const chaptersBySubject = {};
  const headerRow = data[0];
  const subjectCol = headerRow.findIndex(
    h => h && String(h).toLowerCase().includes('subject')
  );
  const chapterCol = headerRow.findIndex(
    h => h && String(h).toLowerCase().includes('chapter')
  );

  const subCol = subjectCol >= 0 ? subjectCol : 0;
  const chapCol = chapterCol >= 0 ? chapterCol : 1;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const subject = String(row[subCol] || '').trim();
    const chapter = String(row[chapCol] || '').trim();
    if (!subject || !chapter) continue;

    if (!chaptersBySubject[subject]) chaptersBySubject[subject] = [];
    if (!chaptersBySubject[subject].includes(chapter)) {
      chaptersBySubject[subject].push(chapter);
    }
  }

  return chaptersBySubject;
}
