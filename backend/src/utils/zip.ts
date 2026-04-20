import archiver from 'archiver';
import { Readable } from 'stream';

export interface ZipFile {
  name: string;
  content: string | Buffer;
}

export const createZip = async (files: ZipFile[]): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided for ZIP creation');
      }

      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      const buffers: Buffer[] = [];

      archive.on('data', (chunk) => {
        buffers.push(chunk);
      });

      archive.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve(buffer);
      });

      archive.on('error', (err) => {
        reject(new Error(`Failed to create ZIP: ${err.message}`));
      });

      archive.on('warning', (warn) => {
        if (warn.code === 'ENOENT') {
          console.warn('ZIP Warning:', warn.message);
        } else {
          reject(new Error(`ZIP Warning: ${warn.message}`));
        }
      });

      files.forEach(({ name, content }) => {
        if (!name) {
          throw new Error('File name is required');
        }

        if (typeof content === 'string') {
          archive.append(content, { name });
        } else if (Buffer.isBuffer(content)) {
          archive.append(content, { name });
        } else {
          throw new Error(`Invalid content type for file: ${name}`);
        }
      });

      archive.finalize();
    } catch (error) {
      reject(new Error(`ZIP creation error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};

export const createZipFromStream = async (
  files: Array<{ name: string; stream: Readable }>
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided for ZIP creation');
      }

      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      const buffers: Buffer[] = [];

      archive.on('data', (chunk) => {
        buffers.push(chunk);
      });

      archive.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve(buffer);
      });

      archive.on('error', (err) => {
        reject(new Error(`Failed to create ZIP: ${err.message}`));
      });

      files.forEach(({ name, stream }) => {
        if (!name) {
          throw new Error('File name is required');
        }
        archive.append(stream, { name });
      });

      archive.finalize();
    } catch (error) {
      reject(new Error(`ZIP creation error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};
