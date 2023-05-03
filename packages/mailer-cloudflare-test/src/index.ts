import { sendFormData } from "@webstudio-is/mailer";

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);

    const to = url.searchParams.get("to");

    if (to == null) {
      return new Response(
        `Set "to" query parameter to your email. Example: https://...?to=bob@example.com`
      );
    }

    const formData = new FormData();
    formData.append("name", "Bob");
    formData.append("time", new Date().toLocaleString("en-US"));

    const result = await sendFormData(
      {
        from: { email: "test@webstudio.is" },
        to: { email: to },
        subject: "New submission of your form",
      },
      formData
    );

    if (result.success) {
      return new Response(`Email sent to ${to}`);
    }

    return new Response(
      `Failed to send email. Errors: ${JSON.stringify(result.errors)}`
    );
  },
};
