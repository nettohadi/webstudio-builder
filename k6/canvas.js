import http from "k6/http";

export default function () {
  let response = http.request(
    "GET",
    "https://webstudio-designer-69fygn731-webstudio-is.vercel.app/less-big?projectId=9fcbbbd6-f684-4868-89f1-3a039b2c24cf&mode=edit",
    // "https://webstudio-designer-69fygn731-webstudio-is.vercel.app/empty?projectId=9fcbbbd6-f684-4868-89f1-3a039b2c24cf&mode=edit",
    null,
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,ru;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "iframe",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "upgrade-insecure-requests": "1",
        cookie:
          "_session=eyJ1c2VyIjp7ImlkIjoiNWY5MWIwYzMtOGYxYy00ZmM2LWIzZGItZGI0MTc2YmRmODYzIiwiZW1haWwiOiJoZWxsb0B3ZWJzdHVkaW8uaXMiLCJwcm92aWRlciI6ImRldiIsImltYWdlIjoiIiwidXNlcm5hbWUiOiJhZG1pbiIsImNyZWF0ZWRBdCI6IjIwMjItMDktMDlUMDk6MzI6MjIuNDE1WiIsInRlYW1JZCI6ImRmM2I1OTc5LWY4OTEtNDVmNi1iNGFhLWYyNzZiMDQ1NmJlNiJ9LCJzdHJhdGVneSI6ImZvcm0ifQ%3D%3D.Na%2BVf27MOCCoNteh4bvoZqqPKE3uCFfYBbyiyM%2Ffdzs",
        Referer:
          "https://webstudio-designer-69fygn731-webstudio-is.vercel.app/designer/9fcbbbd6-f684-4868-89f1-3a039b2c24cf?pageId=b7349110-758e-4c65-98e1-80fec2974082",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    }
  );

  console.log(response.status);
}
