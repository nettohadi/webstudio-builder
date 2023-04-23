import { z } from "zod";
import type { SignatureV4 } from "@aws-sdk/signature-v4";
import {
  type UploadHandler,
  unstable_parseMultipartFormData as parseMultipartFormData,
  unstable_composeUploadHandlers as composeUploadHandlers,
  MaxPartSizeExceededError,
} from "@remix-run/node";
import { Location } from "@webstudio-is/prisma-client";
import { toUint8Array } from "../../utils/to-uint8-array";
import { getAssetData, AssetData } from "../../utils/get-asset-data";
import { idsFormDataFieldName } from "../../schema";
import { getUniqueFilename } from "../../utils/get-unique-filename";
import { sanitizeS3Key } from "../../utils/sanitize-s3-key";
import { uuidHandler } from "../../utils/uuid-handler";
import { HttpRequest } from "@aws-sdk/protocol-http";

const Ids = z.array(z.string().uuid());

/**
 * Do not change. Upload code assumes its 1.
 */
const MAX_FILES_PER_REQUEST = 1;

export const uploadToS3 = async ({
  signer,
  request,
  maxSize,
  endpoint,
  bucket,
  acl,
}: {
  signer: SignatureV4;
  request: Request;
  maxSize: number;
  endpoint: string;
  bucket: string;
  acl?: string;
}): Promise<AssetData> => {
  const uploadHandler = createUploadHandler({
    signer,
    endpoint,
    bucket,
    acl,
    maxFiles: MAX_FILES_PER_REQUEST,
    maxSize,
  });

  const formData = await parseMultipartFormData(
    request,
    composeUploadHandlers(uploadHandler, uuidHandler)
  );

  const imagesFormData = formData.getAll("image") as Array<string>;
  const fontsFormData = formData.getAll("font") as Array<string>;
  const ids = Ids.parse(formData.getAll(idsFormDataFieldName));

  const assetsData = [...imagesFormData, ...fontsFormData]
    .slice(0, MAX_FILES_PER_REQUEST)
    .map((dataString, index) => {
      return AssetData.parse({ ...JSON.parse(dataString), id: ids[index] });
    });

  return assetsData[0];
};

const createUploadHandler = ({
  signer,
  endpoint,
  bucket,
  acl,
  maxFiles,
  maxSize,
}: {
  signer: SignatureV4;
  endpoint: string;
  bucket: string;
  acl?: string;
  maxFiles: number;
  maxSize: number;
}): UploadHandler => {
  let count = 0;

  return async (file) => {
    if (file.filename === undefined) {
      // Do not parse if it's not a file
      return;
    }

    if (count >= maxFiles) {
      // Do not throw, just ignore the file
      // In case of throw we need to delete previously uploaded files
      return;
    }

    count++;

    if (!file.data) {
      throw new Error("Your asset seems to be empty");
    }

    // @todo this is going to put the entire file in memory
    // this has to be a stream that goes directly to s3
    // Size check has to happen as you stream and interrupted when size is too big
    // Also check if S3 client has an option to check the size limit
    const data = await toUint8Array(file.data);

    if (data.byteLength > maxSize) {
      throw new MaxPartSizeExceededError(file.name, maxSize);
    }

    const fileName = sanitizeS3Key(file.filename);

    const uniqueFilename = getUniqueFilename(fileName);

    const url = new URL(`/${bucket}/${uniqueFilename}`, endpoint);

    const s3Request = await signer.sign(
      new HttpRequest({
        method: "PUT",
        protocol: url.protocol,
        hostname: url.hostname,
        path: url.pathname,
        headers: {
          "x-amz-date": new Date().toISOString(),
          "Content-Type": file.contentType,
          "Content-Length": `${data.byteLength}`,
          "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
          // encodeURIComponent is needed to support special characters like Cyrillic
          "x-amz-meta-filename": encodeURIComponent(fileName) || "unnamed",
          // when no ACL passed we do not default since some providers do not support it
          ...(acl ? { "x-amz-acl": acl } : {}),
        },
        body: data,
      })
    );

    const response = await fetch(url, {
      method: s3Request.method,
      headers: s3Request.headers,
      body: data,
    });

    if (response.status !== 200) {
      throw Error(`Cannot upload file ${uniqueFilename}`);
    }

    const type = file.contentType.startsWith("image")
      ? ("image" as const)
      : ("font" as const);

    const baseAssetOptions = {
      name: uniqueFilename,
      size: data.byteLength,
      data,
      location: Location.REMOTE,
    };
    let assetOptions;

    if (type === "image") {
      assetOptions = {
        // Id will be set later
        id: "",
        type,
        ...baseAssetOptions,
      };
    } else if (type === "font") {
      assetOptions = {
        // Id will be set later
        id: "",
        type,
        ...baseAssetOptions,
      };
    }

    if (assetOptions === undefined) {
      throw new Error("Asset type not supported");
    }

    const assetData = await getAssetData(assetOptions);

    return JSON.stringify(assetData);
  };
};
