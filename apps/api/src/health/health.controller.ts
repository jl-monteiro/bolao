import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

type HealthResponse = {
  service: "api";
  status: "ok";
  timestamp: string;
};

@ApiTags("health")
@AllowAnonymous()
@Controller("health")
export class HealthController {
  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        service: "api",
        status: "ok",
        timestamp: "2026-06-11T12:00:00.000Z",
      },
    },
  })
  getHealth(): HealthResponse {
    return {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
