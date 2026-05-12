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
            // Find the row that contains headers like Name or First Name
            if (row.length > 0 && typeof row[0] === 'string' && (row[0].trim() === 'Name (Original Name)' || row[0].trim() === 'Name' || row[0].trim() === 'First Name')) {
              headersMatch = true;
              headers = row.map(r => r.trim());
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
