const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const bucketName = process.env.AWS_BUCKET_NAME;

const uploadToS3 = async (file, fileName, folder = 'leases') => {
  const params = {
    Bucket: bucketName,
    Key: `${folder}/${fileName}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        console.error('S3 Upload Error:', err);
        reject(err);
      } else {
        resolve({
          url: data.Location,
          fileName: fileName,
          size: file.size,
          mimeType: file.mimetype,
        });
      }
    });
  });
};

const deleteFromS3 = async (fileName, folder = 'leases') => {
  const params = {
    Bucket: bucketName,
    Key: `${folder}/${fileName}`,
  };

  return new Promise((resolve, reject) => {
    s3.deleteObject(params, (err) => {
      if (err) {
        console.error('S3 Delete Error:', err);
        reject(false);
      } else {
        resolve(true);
      }
    });
  });
};

module.exports = {
  s3,
  uploadToS3,
  deleteFromS3,
};
