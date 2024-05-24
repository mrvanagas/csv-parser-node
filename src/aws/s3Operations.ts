import fs from 'fs';
import AWS from 'aws-sdk';

const s3 = new AWS.S3();

export const uploadToS3 = async (
  filePath: string,
  bucketName: string,
  key: string,
): Promise<void> => {
  const fileStream = fs.createReadStream(filePath);

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
  };

  await s3.upload(params).promise();
  console.log(`File uploaded successfully to ${bucketName}/${key}`);
};

export const downloadFromS3 = async (
  bucketName: string,
  key: string,
  downloadPath: string,
): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const data = await s3.getObject(params).promise();
  fs.writeFileSync(downloadPath, data.Body as Buffer);
  console.log(`File downloaded successfully from ${bucketName}/${key}`);
};
