import Papa from 'papaparse';

export const parseAttendanceCsv = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        let headersMatch = false;
        let data: any[] = [];
        let headers: string[] = [];
        for (const row of results.data as string[][]) {
          if (!headersMatch) {
            // Find the row that contains headers
            const isHeaderRow = row.some(r => {
              if (typeof r !== 'string') return false;
              const val = r.trim().toLowerCase();
              return val.includes('duration') || val.includes('time in session') || val === 'name' || val === 'email' || val.includes('participant');
            });
            if (isHeaderRow && row.length > 1) {
              headersMatch = true;
              headers = row.map(r => typeof r === 'string' ? r.trim() : '');
            }
          } else {
            if (row.length === headers.length && row[0]) {
              let obj: Record<string, string> = {};
              headers.forEach((h, i) => obj[h] = row[i]);
              data.push(obj);
            }
          }
        }
        resolve(data);
      },
      error: (error) => reject(error)
    });
  });
};
