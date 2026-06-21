import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import {
  Prisma,
  PrismaClient,
} from "../generated/prisma/client.js";
import {
  buildTotpUri,
  generateTotpSecret,
  verifyTotpCode,
} from "./totp.js";

export const MFA_CLOCK = Symbol("MfaClock");

export type MfaClock = {
  now(): Date;
};

export type MfaStatusResult = {
  enabledAt: Date | null;
  totpEnabled: boolean;
};

export type MfaSetupResult = {
  otpauthUri: string;
  secret: string;
};

@Injectable()
export class MfaService {
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
    @Inject(MFA_CLOCK)
    private readonly clock: MfaClock,
  ) {
    const secret = this.config.get<string>("BETTER_AUTH_SECRET", "");

    if (!secret) {
      throw new InternalServerErrorException(
        "BETTER_AUTH_SECRET é obrigatório para MFA.",
      );
    }

    this.encryptionKey = createHash("sha256").update(secret).digest();
  }

  async getStatus(userId: string): Promise<MfaStatusResult> {
    const user = await this.prisma.user.findUnique({
      select: {
        totpEnabledAt: true,
      },
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException("Conta não encontrada.");
    }

    return {
      enabledAt: user.totpEnabledAt,
      totpEnabled: user.totpEnabledAt !== null,
    };
  }

  async beginSetup(userId: string): Promise<MfaSetupResult> {
    const user = await this.prisma.user.findUnique({
      select: {
        email: true,
        id: true,
        totpEnabledAt: true,
      },
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException("Conta não encontrada.");
    }

    if (user.totpEnabledAt) {
      throw new BadRequestException("MFA TOTP já está ativo.");
    }

    const secret = generateTotpSecret();

    await this.prisma.user.update({
      data: {
        totpSecretEncrypted: this.encrypt(secret),
      },
      where: {
        id: userId,
      },
    });

    return {
      otpauthUri: buildTotpUri({
        email: user.email,
        issuer: "Bolao",
        secret,
      }),
      secret,
    };
  }

  async confirmSetup(
    userId: string,
    code: string,
  ): Promise<MfaStatusResult> {
    const user = await this.prisma.user.findUnique({
      select: {
        totpSecretEncrypted: true,
      },
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException("Conta não encontrada.");
    }

    if (!user.totpSecretEncrypted) {
      throw new BadRequestException("Inicie a configuração do MFA TOTP.");
    }

    if (
      !verifyTotpCode({
        code,
        now: this.clock.now(),
        secret: this.decrypt(user.totpSecretEncrypted),
      })
    ) {
      throw new BadRequestException("Código MFA inválido.");
    }

    const updated = await this.prisma.user.update({
      data: {
        totpEnabledAt: this.clock.now(),
      },
      select: {
        totpEnabledAt: true,
      },
      where: {
        id: userId,
      },
    });

    return {
      enabledAt: updated.totpEnabledAt,
      totpEnabled: updated.totpEnabledAt !== null,
    };
  }

  async assertTotpCode(
    client: Prisma.TransactionClient | PrismaClient,
    userId: string,
    code: string,
  ): Promise<void> {
    const user = await client.user.findUnique({
      select: {
        totpEnabledAt: true,
        totpSecretEncrypted: true,
      },
      where: {
        id: userId,
      },
    });

    if (!user?.totpEnabledAt || !user.totpSecretEncrypted) {
      throw new ForbiddenException("Configure MFA TOTP antes desta ação.");
    }

    if (
      !verifyTotpCode({
        code,
        now: this.clock.now(),
        secret: this.decrypt(user.totpSecretEncrypted),
      })
    ) {
      throw new ForbiddenException("Código MFA inválido.");
    }
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      "v1",
      iv.toString("base64url"),
      authTag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(":");
  }

  private decrypt(value: string): string {
    const [version, iv, authTag, encrypted] = value.split(":");

    if (version !== "v1" || !iv || !authTag || !encrypted) {
      throw new InternalServerErrorException("MFA TOTP inválido.");
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
