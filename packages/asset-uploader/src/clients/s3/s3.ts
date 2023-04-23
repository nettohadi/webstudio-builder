import { Sha256 } from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import type { AssetClient } from "../../client";
import { uploadToS3 } from "./upload";

type S3ClientOptions = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  acl?: string;
  maxUploadSize: number;
};

export const createS3Client = (options: S3ClientOptions): AssetClient => {
  const signer = new SignatureV4({
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    region: options.region,
    service: "s3",
    sha256: Sha256,
  });

  const uploadFile: AssetClient["uploadFile"] = async (request) => {
    return await uploadToS3({
      signer,
      request,
      maxSize: options.maxUploadSize,
      endpoint: options.endpoint,
      bucket: options.bucket,
      acl: options.acl,
    });
  };

  const deleteFile: AssetClient["deleteFile"] = async (name) => {
    const url = new URL(`/${options.bucket}/${name}`, options.endpoint);

    const s3Request = await signer.sign({
      method: "DELETE",
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        "x-amz-date": new Date().toISOString(),
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      },
    });

    await fetch(url, {
      method: s3Request.method,
      headers: s3Request.headers,
    });
  };

  return {
    uploadFile,
    deleteFile,
  };
};
