import AWS from 'aws-sdk';
import fs from 'fs';
import { uploadToS3, downloadFromS3 } from '../aws/s3Operations';

jest.mock('aws-sdk', () => {
  const S3 = {
    upload: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({}),
    getObject: jest.fn().mockReturnThis(),
  };
  return { S3: jest.fn(() => S3) };
});

jest.mock('fs', () => ({
  createReadStream: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('uploadToS3', () => {
  it('should upload a file to S3', async () => {
    const mockFilePath = 'path/to/file';
    const mockBucketName = 'bucket';
    const mockKey = 'key';

    await uploadToS3(mockFilePath, mockBucketName, mockKey);
    expect(new AWS.S3().upload).toHaveBeenCalledWith({
      Bucket: mockBucketName,
      Key: mockKey,
      Body: fs.createReadStream(mockFilePath),
    });
  });
});

describe('downloadFromS3', () => {
  it('should download a file from S3', async () => {
    const mockBucketName = 'bucket';
    const mockKey = 'key';
    const mockDownloadPath = 'path/to/download';

    await downloadFromS3(mockBucketName, mockKey, mockDownloadPath);
    expect(new AWS.S3().getObject).toHaveBeenCalledWith({
      Bucket: mockBucketName,
      Key: mockKey,
    });
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
