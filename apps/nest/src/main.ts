// NestJS (default Express platform) + class-validator. Build: npm run build. Run: node apps/nest/dist/main.js
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule, { logger: false });
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
await app.listen(8104);
