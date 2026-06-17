import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";

@Injectable()
export class GroupInviteTokenService {
  generate(): string {
    return randomBytes(32).toString("base64url");
  }

  hash(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }
}
