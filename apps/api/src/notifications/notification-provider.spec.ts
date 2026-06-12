import {
  ConsoleNotificationProvider,
  ResendNotificationProvider,
  createNotificationProvider,
} from "./notification-provider.js";

const message = {
  subject: "Confirme seu e-mail",
  text: "Abra https://example.com/verificar",
  to: "pessoa@example.com",
};

describe("createNotificationProvider", () => {
  it("uses a visible console provider outside production without a Resend key", async () => {
    const messages: string[] = [];
    const log = (entry: string) => messages.push(entry);
    const provider = createNotificationProvider(
      {
        NODE_ENV: "test",
      },
      log,
    );

    expect(provider).toBeInstanceOf(ConsoleNotificationProvider);

    await provider.sendEmail(message);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("https://example.com/verificar");
  });

  it("uses Resend when credentials are configured", () => {
    const provider = createNotificationProvider({
      EMAIL_FROM: "Bolao <contato@example.com>",
      NODE_ENV: "production",
      RESEND_API_KEY: "re_test",
    });

    expect(provider).toBeInstanceOf(ResendNotificationProvider);
  });

  it("rejects production startup without email credentials", () => {
    expect(() =>
      createNotificationProvider({
        NODE_ENV: "production",
      }),
    ).toThrow("RESEND_API_KEY and EMAIL_FROM are required in production");
  });
});
