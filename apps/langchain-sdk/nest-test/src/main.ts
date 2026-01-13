import "reflect-metadata";
import * as path from "path";
import * as dotenv from "dotenv";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.RAG_PORT
    ? Number(process.env.RAG_PORT)
    : process.env.PORT
      ? Number(process.env.PORT)
      : 3100;
  await app.listen(port);
  console.log(`RAG nest-test listening on http://127.0.0.1:${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
