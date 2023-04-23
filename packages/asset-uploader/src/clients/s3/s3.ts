import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { S3Client } from "@aws-sdk/client-s3";
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

  // @todo find a way to destroy this client to free resources
  const client = new S3Client({
    endpoint: options.endpoint,
    region: options.region,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });

  const uploadFile: AssetClient["uploadFile"] = async (request) => {
    return await uploadToS3({
      client,
      request,
      maxSize: options.maxUploadSize,
      bucket: options.bucket,
      acl: options.acl,
    });
  };

  const deleteFile: AssetClient["deleteFile"] = async (name) => {
    const url = new URL(`/${options.bucket}/${name}`, options.endpoint);

    const request = await signer.sign(
      new HttpRequest({
        method: "DELETE",
        protocol: url.protocol,
        hostname: url.hostname,
        path: url.pathname,
        headers: {
          "x-amz-date": new Date().toISOString(),
          "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        },
      })
    );

    await fetch(url, {
      method: request.method,
      headers: request.headers,
    });
  };

  return {
    uploadFile,
    deleteFile,
  };
};
