import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    const region = process.env.AWS_REGION;
    if (!region) {
      throw new Error('AWS_REGION env var not set');
    }
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    // On EC2 with an IAM role, omit credentials — SDK uses instance metadata automatically.
    // With explicit keys (local dev / non-EC2), pass them directly.
    _client = new S3Client({
      region,
      ...(process.env.AWS_ENDPOINT_URL
        ? { endpoint: process.env.AWS_ENDPOINT_URL, forcePathStyle: true }
        : {}),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }
  return _client;
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_S3_BUCKET env var not set');
  return bucket;
}

export async function initiateMultipartUpload(
  sessionId: string
): Promise<{ uploadId: string; key: string }> {
  const key = `recordings/${sessionId}/${sessionId}.webm`;
  const cmd = new CreateMultipartUploadCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: 'video/webm',
  });
  const res = await getClient().send(cmd);
  if (!res.UploadId) throw new Error('S3 did not return an UploadId');
  return { uploadId: res.UploadId, key };
}

export async function uploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
  body: Buffer
): Promise<{ ETag: string }> {
  const cmd = new UploadPartCommand({
    Bucket: getBucket(),
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: body,
  });
  const res = await getClient().send(cmd);
  if (!res.ETag) throw new Error(`No ETag returned for part ${partNumber}`);
  return { ETag: res.ETag };
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
): Promise<void> {
  const cmd = new CompleteMultipartUploadCommand({
    Bucket: getBucket(),
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });
  try {
    await getClient().send(cmd);
  } catch (err: any) {
    console.error(`[s3Service.completeMultipartUpload] Error: code=${err.Code ?? err.name} message=${err.message} uploadId=${uploadId} key=${key} parts=${JSON.stringify(parts)}`);
    throw err;
  }
}

export async function abortMultipartUpload(
  key: string,
  uploadId: string
): Promise<void> {
  const cmd = new AbortMultipartUploadCommand({
    Bucket: getBucket(),
    Key: key,
    UploadId: uploadId,
  });
  await getClient().send(cmd);
}

export async function getPresignedUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  return awsGetSignedUrl(getClient(), cmd, { expiresIn: expiresInSeconds });
}
