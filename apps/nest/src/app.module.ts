import { Module } from "@nestjs/common";
import { UsersController, UsersDbController } from "./users.controller.js";

@Module({ controllers: [UsersController, UsersDbController] })
export class AppModule {}
