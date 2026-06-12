import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("reports the API as healthy", () => {
    const response = new HealthController().getHealth();

    expect(response.service).toBe("api");
    expect(response.status).toBe("ok");
    expect(Date.parse(response.timestamp)).not.toBeNaN();
  });
});
