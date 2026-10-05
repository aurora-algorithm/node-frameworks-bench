import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { IsEmail, IsInt, Length, Max, Min } from "class-validator";
// @ts-expect-error -- plain JavaScript module shared with the other frameworks
import { pageQuery, pool, randomStart, users } from "../../shared.mjs";

class NewUserDto {
  @Length(1, 50) name: string;
  @IsEmail() email: string;
  @IsInt() @Min(0) @Max(150) age: number;
}

@Controller("users")
export class UsersController {
  @Get()
  list() {
    return users();
  }

  @Post()
  @HttpCode(201)
  create(@Body() body: NewUserDto) {
    return { id: 1, ...body };
  }
}

@Controller("users-db")
export class UsersDbController {
  @Get()
  async page() {
    const { rows } = await pool.query(pageQuery, [randomStart()]);
    return rows;
  }
}
