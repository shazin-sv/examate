import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';

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

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  return wbout;
}

export async function downloadTemplate(subjects) {
  try {
    const wbout = generateTemplate(subjects);
    const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const uri = dir + 'chapters_template.xlsx';

    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: 'base64',
    });

    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      throw new Error('File was not created');
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Save Chapter Template',
      });
    }
    return uri;
  } catch (e) {
    console.log('Template download error:', e);
    throw e;
  }
}

export async function importFromExcel() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      '*/*',
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const fileUri = result.assets[0].uri;
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: 'base64',
  });
  const wb = XLSX.read(base64, { type: 'base64' });

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
