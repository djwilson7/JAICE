import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("standalone demo deployment", () => {
  it("builds only with the demo project mode", () => {
    const dockerfile = readProjectFile("client/Dockerfile.client");

    expect(dockerfile).toContain("ARG VITE_PROJECT_MODE=demo");
    expect(dockerfile).toContain("ENV VITE_PROJECT_MODE=${VITE_PROJECT_MODE}");
    expect(dockerfile).toContain(
      'RUN test "$VITE_PROJECT_MODE" = "demo" && npm run build'
    );
  });

  it("ships the hardened SPA configuration", () => {
    const dockerfile = readProjectFile("client/Dockerfile.client");
    const nginxConfig = readProjectFile("client/nginx.demo.conf");

    expect(dockerfile).toContain(
      "COPY client/nginx.demo.conf /etc/nginx/conf.d/default.conf"
    );
    expect(nginxConfig).toContain("try_files $uri $uri/ /index.html;");
    expect(nginxConfig).toContain("connect-src 'none'");
    expect(nginxConfig).toContain("form-action 'none'");
    expect(nginxConfig).toContain("frame-ancestors 'none'");
  });
});
