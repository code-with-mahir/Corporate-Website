import { stringify } from 'csv-stringify';

export interface CsvHeader {
  key: string;
  header: string;
}

export const generateCSV = async (
  data: any[],
  headers: CsvHeader[]
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data provided for CSV generation');
      }

      if (!headers || headers.length === 0) {
        throw new Error('No headers provided for CSV generation');
      }

      const columns = headers.reduce((acc, { key, header }) => {
        acc[key] = header;
        return acc;
      }, {} as Record<string, string>);

      const records = data.map((row) => {
        const record: Record<string, any> = {};
        headers.forEach(({ key }) => {
          record[key] = row[key] ?? '';
        });
        return record;
      });

      stringify(
        records,
        {
          header: true,
          columns,
          quoted: true,
          quoted_empty: true,
        },
        (err, output) => {
          if (err) {
            reject(new Error(`Failed to generate CSV: ${err.message}`));
          } else {
            resolve(output);
          }
        }
      );
    } catch (error) {
      reject(new Error(`CSV generation error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};

export const generateCSVFromObjects = async (
  data: any[],
  columnNames?: string[]
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data provided for CSV generation');
      }

      const columns = columnNames || Object.keys(data[0]);

      stringify(
        data,
        {
          header: true,
          columns,
          quoted: true,
          quoted_empty: true,
        },
        (err, output) => {
          if (err) {
            reject(new Error(`Failed to generate CSV: ${err.message}`));
          } else {
            resolve(output);
          }
        }
      );
    } catch (error) {
      reject(new Error(`CSV generation error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};
